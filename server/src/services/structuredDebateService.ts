'use strict';

import type { HydratedDocument, Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import appModForDb from '../app';
import constantsMod from '../models/constants';
import type { AuthUser } from '../types/auth';
import {
  STRUCTURED_DEBATE_CONSENT_VERSION,
  STRUCTURED_DEBATE_CONTRIBUTION_TYPES,
  STRUCTURED_DEBATE_FORMAT_VERSION,
  STRUCTURED_DEBATE_PHASE_KEYS,
  STRUCTURED_DEBATE_STANCES,
  type StructuredDebateContributionRecord,
  type StructuredDebateContributionType,
  type StructuredDebateEvidenceLink,
  type StructuredDebateParticipantRecord,
  type StructuredDebatePhaseKey,
  type StructuredDebatePhaseRecord,
  type StructuredDebatePilotRecord,
  type StructuredDebateStance,
  type StructuredDebateTransitionRecord,
} from '../types/structuredDebate';
import {
  canCreateStructuredDebate,
  canFacilitateStructuredDebate,
  structuredDebatePublicUsername,
  structuredDebateUserId,
} from './structuredDebateAccess';
import { StructuredDebateError } from './structuredDebateErrors';
import { buildPublicStructuredDebate } from './structuredDebateProjection';
import type { AgentAttributionFields } from './agentAttributionService';

export { StructuredDebateError } from './structuredDebateErrors';
export { buildPublicStructuredDebate } from './structuredDebateProjection';

type EntrySnapshot = {
  _id?: unknown;
  title?: unknown;
  friendlyUrl?: unknown;
  private?: unknown;
};

type StructuredDebateModels = {
  StructuredDebatePilot: Model<StructuredDebatePilotRecord>;
  StructuredDebateParticipant: Model<StructuredDebateParticipantRecord>;
  StructuredDebateContribution: Model<StructuredDebateContributionRecord>;
  Topic: Model<EntrySnapshot>;
  Argument: Model<EntrySnapshot>;
  Question: Model<EntrySnapshot>;
  Answer: Model<EntrySnapshot>;
  Issue: Model<EntrySnapshot>;
  Opinion: Model<EntrySnapshot>;
  Artifact: Model<EntrySnapshot>;
};

const db = (appModForDb as unknown as { db: { models: StructuredDebateModels } }).db.models;
const constants = constantsMod as unknown as { OBJECT_TYPES: Record<string, number> };

const ENTRY_MODELS = {
  topic: 'Topic',
  argument: 'Argument',
  question: 'Question',
  answer: 'Answer',
  issue: 'Issue',
  opinion: 'Opinion',
  artifact: 'Artifact',
} as const;

type SupportedEntryName = keyof typeof ENTRY_MODELS;
type TransitionAction = 'pause' | 'resume' | 'advance' | 'close' | 'cancel';

const PHASE_LABELS: Record<StructuredDebatePhaseKey, string> = {
  opening: 'Opening',
  response: 'Response',
  rebuttal: 'Rebuttal',
  closing: 'Closing',
};

function requiredString(value: unknown, label: string, min: number, max: number): string {
  const text = String(value || '').trim();
  if (text.length < min || text.length > max) {
    throw new StructuredDebateError(400, 'DEBATE_VALIDATION_ERROR', `${label} must be ${min} to ${max} characters.`);
  }
  return text;
}

function duplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && Number((error as { code?: unknown }).code) === 11000);
}

function supportedEntryName(value: unknown): SupportedEntryName {
  const name = String(value || '').trim().toLowerCase();
  if (!(name in ENTRY_MODELS)) {
    throw new StructuredDebateError(400, 'DEBATE_ENTRY_TYPE_UNSUPPORTED', 'This entry type does not support the pilot.');
  }
  return name as SupportedEntryName;
}

function objectTypeFor(name: SupportedEntryName): number {
  const value = Number(constants.OBJECT_TYPES[name]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new StructuredDebateError(500, 'DEBATE_ENTRY_TYPE_MISSING', 'The entry type is not configured.');
  }
  return value;
}

function normalizeStance(value: unknown): StructuredDebateStance {
  const stance = String(value || '').trim().toLowerCase();
  if (!STRUCTURED_DEBATE_STANCES.includes(stance as StructuredDebateStance)) {
    throw new StructuredDebateError(400, 'DEBATE_STANCE_REQUIRED', 'Choose Supports or Challenges before joining.');
  }
  return stance as StructuredDebateStance;
}

function normalizeContributionType(value: unknown): StructuredDebateContributionType {
  const contributionType = String(value || '').trim().toLowerCase();
  if (!STRUCTURED_DEBATE_CONTRIBUTION_TYPES.includes(contributionType as StructuredDebateContributionType)) {
    throw new StructuredDebateError(400, 'DEBATE_CONTRIBUTION_TYPE_INVALID', 'Choose a valid contribution type.');
  }
  return contributionType as StructuredDebateContributionType;
}

function normalizeEvidenceLinks(value: unknown): StructuredDebateEvidenceLink[] {
  if (!Array.isArray(value)) return [];
  if (value.length > 5) {
    throw new StructuredDebateError(400, 'DEBATE_EVIDENCE_LIMIT', 'A contribution may include up to five evidence links.');
  }
  return value.map((item) => {
    const row: Record<string, unknown> = item && typeof item === 'object' && !Array.isArray(item)
      ? item as Record<string, unknown>
      : { url: item };
    const rawUrl = String(row.url || '').trim();
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new StructuredDebateError(400, 'DEBATE_EVIDENCE_URL_INVALID', 'Evidence links must be valid public HTTP or HTTPS URLs.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new StructuredDebateError(400, 'DEBATE_EVIDENCE_URL_INVALID', 'Evidence links must be valid public HTTP or HTTPS URLs.');
    }
    return {
      url: parsed.toString().slice(0, 2000),
      label: String(row.label || '').trim().slice(0, 160),
    };
  });
}

function activeEntryKey(objectType: number, entryId: string): string {
  return `${objectType}:${entryId}`;
}

function createPhases(now: Date, windowHours: number): StructuredDebatePhaseRecord[] {
  return STRUCTURED_DEBATE_PHASE_KEYS.map((key, order) => ({
    key,
    label: PHASE_LABELS[key],
    order,
    status: order === 0 ? 'active' : 'upcoming',
    startedAt: order === 0 ? now : null,
    dueAt: order === 0 ? new Date(now.getTime() + windowHours * 60 * 60 * 1000) : null,
    completedAt: null,
  }));
}

async function entrySnapshot(objectName: SupportedEntryName, id: string): Promise<EntrySnapshot> {
  if (!isValidObjectId(id)) {
    throw new StructuredDebateError(400, 'DEBATE_ENTRY_ID_INVALID', 'A valid entry id is required.');
  }
  const model = db[ENTRY_MODELS[objectName]];
  const entry = await model.findById(id).select({ title: 1, friendlyUrl: 1, private: 1 }).lean();
  if (!entry || entry.private === true) {
    throw new StructuredDebateError(404, 'DEBATE_ENTRY_NOT_FOUND', 'A public entry was not found.');
  }
  return entry;
}

async function pilotDocument(id: string): Promise<HydratedDocument<StructuredDebatePilotRecord>> {
  if (!isValidObjectId(id)) {
    throw new StructuredDebateError(404, 'DEBATE_NOT_FOUND', 'Structured debate not found.');
  }
  const pilot = await db.StructuredDebatePilot.findById(id);
  if (!pilot) {
    throw new StructuredDebateError(404, 'DEBATE_NOT_FOUND', 'Structured debate not found.');
  }
  return pilot;
}

function transitionEvent(
  eventType: StructuredDebateTransitionRecord['eventType'],
  actor: AuthUser,
  fields: Partial<StructuredDebateTransitionRecord> = {},
): StructuredDebateTransitionRecord {
  return {
    eventType,
    actorUserId: structuredDebateUserId(actor),
    actorLabel: 'Facilitator',
    fromStatus: fields.fromStatus || '',
    toStatus: fields.toStatus || '',
    fromPhase: fields.fromPhase || '',
    toPhase: fields.toPhase || '',
    publicReason: String(fields.publicReason || '').trim().slice(0, 500),
    createDate: new Date(),
  };
}

export async function createStructuredDebate(input: {
  entryObjectName: unknown;
  entryId: unknown;
  proposition?: unknown;
  participantLimit?: unknown;
  phaseWindowHours?: unknown;
  user: AuthUser;
}): Promise<Record<string, unknown>> {
  if (!canCreateStructuredDebate(input.user)) {
    throw new StructuredDebateError(403, 'DEBATE_FACILITATOR_REQUIRED', 'Reviewer or administrator access is required to start a pilot.');
  }
  const objectName = supportedEntryName(input.entryObjectName);
  const id = String(input.entryId || '').trim();
  const entry = await entrySnapshot(objectName, id);
  const objectType = objectTypeFor(objectName);
  const now = new Date();
  const phaseWindowHours = Math.min(Math.max(Number(input.phaseWindowHours || 24), 1), 168);
  const participantLimit = Math.min(Math.max(Number(input.participantLimit || 12), 2), 40);
  const title = requiredString(entry.title, 'Entry title', 1, 300);
  const proposition = requiredString(input.proposition || title, 'Proposition', 10, 500);

  try {
    const pilot = await db.StructuredDebatePilot.create({
      activeEntryKey: activeEntryKey(objectType, id),
      entryObjectType: objectType,
      entryObjectName: objectName,
      entryId: id,
      entryTitle: title,
      entryFriendlyUrl: String(entry.friendlyUrl || '').trim().slice(0, 300),
      proposition,
      status: 'open',
      formatVersion: STRUCTURED_DEBATE_FORMAT_VERSION,
      consentVersion: STRUCTURED_DEBATE_CONSENT_VERSION,
      participantLimit,
      phaseWindowHours,
      contributionLimitPerParticipantPerPhase: 1,
      evidenceRequired: true,
      currentPhaseKey: 'opening',
      phases: createPhases(now, phaseWindowHours),
      facilitatorUserIds: [structuredDebateUserId(input.user)],
      createUserId: structuredDebateUserId(input.user),
      createUsername: structuredDebatePublicUsername(input.user),
      createDate: now,
      editDate: now,
      transitions: [transitionEvent('pilot_created', input.user, { toStatus: 'open', toPhase: 'opening' })],
    });
    return buildPublicStructuredDebate(String(pilot._id), input.user);
  } catch (error) {
    if (duplicateKey(error)) {
      throw new StructuredDebateError(409, 'DEBATE_ALREADY_ACTIVE', 'This entry already has an active structured-debate pilot.');
    }
    throw error;
  }
}

export async function findStructuredDebateForEntry(input: {
  entryObjectName: unknown;
  entryId: unknown;
  user?: AuthUser | null;
}): Promise<Record<string, unknown> | null> {
  const objectName = supportedEntryName(input.entryObjectName);
  const id = String(input.entryId || '').trim();
  if (!isValidObjectId(id)) return null;
  const pilot = await db.StructuredDebatePilot.findOne({
    entryObjectType: objectTypeFor(objectName),
    entryId: id,
  }).sort({ createDate: -1 }).lean();
  return pilot?._id ? buildPublicStructuredDebate(String(pilot._id), input.user) : null;
}

export async function joinStructuredDebate(input: {
  pilotId: string;
  stance: unknown;
  consentAccepted: unknown;
  publicAttributionAccepted: unknown;
  consentVersion: unknown;
  user: AuthUser;
}): Promise<Record<string, unknown>> {
  const pilot = await pilotDocument(input.pilotId);
  if (pilot.status !== 'open') {
    throw new StructuredDebateError(409, 'DEBATE_NOT_OPEN', 'This pilot is not accepting participants.');
  }
  if (input.consentAccepted !== true || input.publicAttributionAccepted !== true
    || String(input.consentVersion || '') !== pilot.consentVersion) {
    throw new StructuredDebateError(400, 'DEBATE_CONSENT_REQUIRED', 'Explicit pilot and public-attribution consent is required.');
  }
  const id = structuredDebateUserId(input.user);
  const existing = await db.StructuredDebateParticipant.findOne({ pilotId: pilot._id, userId: id }).lean();
  if (existing) {
    throw new StructuredDebateError(409, 'DEBATE_PARTICIPATION_EXISTS', existing.status === 'withdrawn'
      ? 'Withdrawn participation cannot be reactivated in pilot format v1.'
      : 'You already joined this pilot.');
  }
  const activeCount = await db.StructuredDebateParticipant.countDocuments({ pilotId: pilot._id, status: 'active' });
  if (activeCount >= pilot.participantLimit) {
    throw new StructuredDebateError(409, 'DEBATE_PARTICIPANT_LIMIT', 'This pilot has reached its participant limit.');
  }
  const now = new Date();
  try {
    await db.StructuredDebateParticipant.create({
      pilotId: pilot._id,
      userId: id,
      publicUsername: structuredDebatePublicUsername(input.user),
      stance: normalizeStance(input.stance),
      status: 'active',
      consentVersion: pilot.consentVersion,
      publicAttributionAccepted: true,
      consentedAt: now,
      createDate: now,
      editDate: now,
    });
  } catch (error) {
    if (duplicateKey(error)) {
      throw new StructuredDebateError(409, 'DEBATE_PARTICIPATION_EXISTS', 'You already joined this pilot.');
    }
    throw error;
  }
  return buildPublicStructuredDebate(input.pilotId, input.user);
}

export async function withdrawStructuredDebate(input: {
  pilotId: string;
  user: AuthUser;
}): Promise<Record<string, unknown>> {
  const pilot = await pilotDocument(input.pilotId);
  if (pilot.status === 'closed' || pilot.status === 'cancelled') {
    throw new StructuredDebateError(409, 'DEBATE_TERMINAL', 'Participation cannot change after a pilot is closed or cancelled.');
  }
  const participant = await db.StructuredDebateParticipant.findOne({
    pilotId: pilot._id,
    userId: structuredDebateUserId(input.user),
  });
  if (!participant || participant.status !== 'active') {
    throw new StructuredDebateError(409, 'DEBATE_PARTICIPATION_INACTIVE', 'No active participation was found.');
  }
  participant.status = 'withdrawn';
  participant.withdrewAt = new Date();
  participant.editDate = new Date();
  await participant.save();
  return buildPublicStructuredDebate(input.pilotId, input.user);
}

export async function submitStructuredDebateContribution(input: {
  pilotId: string;
  contributionType: unknown;
  content: unknown;
  evidenceLinks: unknown;
  user: AuthUser;
  attribution?: AgentAttributionFields;
}): Promise<Record<string, unknown>> {
  const pilot = await pilotDocument(input.pilotId);
  if (pilot.status !== 'open') {
    throw new StructuredDebateError(409, 'DEBATE_NOT_OPEN', 'Contributions are accepted only while the pilot is open.');
  }
  const phase = pilot.phases.find((item) => item.key === pilot.currentPhaseKey && item.status === 'active');
  if (!phase) {
    throw new StructuredDebateError(409, 'DEBATE_PHASE_INACTIVE', 'There is no active debate phase.');
  }
  if (phase.dueAt && new Date(phase.dueAt).getTime() < Date.now()) {
    throw new StructuredDebateError(409, 'DEBATE_PHASE_DUE', 'This phase is awaiting facilitator review before more contributions.');
  }
  const participant = await db.StructuredDebateParticipant.findOne({
    pilotId: pilot._id,
    userId: structuredDebateUserId(input.user),
    status: 'active',
  }).lean();
  if (!participant) {
    throw new StructuredDebateError(403, 'DEBATE_PARTICIPATION_REQUIRED', 'Join this pilot before contributing.');
  }
  const phaseContributionCount = await db.StructuredDebateContribution.countDocuments({
    pilotId: pilot._id,
    phaseKey: pilot.currentPhaseKey,
  });
  const currentTurnStance: StructuredDebateStance = phaseContributionCount % 2 === 0 ? 'supports' : 'challenges';
  if (participant.stance !== currentTurnStance) {
    throw new StructuredDebateError(409, 'DEBATE_WAIT_FOR_TURN', `The current turn belongs to ${currentTurnStance}.`);
  }
  const content = requiredString(input.content, 'Contribution', 40, 2000);
  const evidenceLinks = normalizeEvidenceLinks(input.evidenceLinks);
  if (pilot.evidenceRequired && evidenceLinks.length === 0) {
    throw new StructuredDebateError(400, 'DEBATE_EVIDENCE_REQUIRED', 'At least one public evidence link is required.');
  }
  try {
    const attribution = input.attribution || {
      authorshipType: 'human', apiClientId: null, apiClientName: '', agentRunId: '', agentModel: '',
      agentProvider: '', agentPurpose: '', agentSourceManifest: [],
    };
    await db.StructuredDebateContribution.create({
      pilotId: pilot._id,
      participantId: participant._id,
      userId: participant.userId,
      publicUsername: participant.publicUsername,
      stance: participant.stance,
      phaseKey: pilot.currentPhaseKey,
      contributionType: normalizeContributionType(input.contributionType),
      content,
      evidenceLinks,
      ...attribution,
      revisionNumber: 1,
      createDate: new Date(),
      editDate: new Date(),
    });
  } catch (error) {
    if (duplicateKey(error)) {
      throw new StructuredDebateError(409, 'DEBATE_CONTRIBUTION_LIMIT', 'Pilot format v1 allows one contribution per participant in each phase.');
    }
    throw error;
  }
  return buildPublicStructuredDebate(input.pilotId, input.user);
}

export async function transitionStructuredDebate(input: {
  pilotId: string;
  action: unknown;
  publicReason?: unknown;
  user: AuthUser;
}): Promise<Record<string, unknown>> {
  const pilot = await pilotDocument(input.pilotId);
  if (!canFacilitateStructuredDebate(pilot, input.user)) {
    throw new StructuredDebateError(403, 'DEBATE_FACILITATOR_REQUIRED', 'Only an assigned facilitator can change this pilot.');
  }
  const action = String(input.action || '').trim().toLowerCase() as TransitionAction;
  if (!['pause', 'resume', 'advance', 'close', 'cancel'].includes(action)) {
    throw new StructuredDebateError(400, 'DEBATE_TRANSITION_INVALID', 'Choose a valid facilitator action.');
  }
  if (pilot.status === 'closed' || pilot.status === 'cancelled') {
    throw new StructuredDebateError(409, 'DEBATE_TERMINAL', 'Closed and cancelled pilots are immutable.');
  }
  const now = new Date();
  const fromStatus = pilot.status;
  const fromPhase = pilot.currentPhaseKey;
  const publicReason = String(input.publicReason || '').trim().slice(0, 500);

  if (action === 'pause') {
    if (pilot.status !== 'open') throw new StructuredDebateError(409, 'DEBATE_TRANSITION_INVALID', 'Only an open pilot can be paused.');
    pilot.status = 'paused';
    pilot.transitions.push(transitionEvent('pilot_paused', input.user, { fromStatus, toStatus: 'paused', fromPhase, publicReason }));
  } else if (action === 'resume') {
    if (pilot.status !== 'paused') throw new StructuredDebateError(409, 'DEBATE_TRANSITION_INVALID', 'Only a paused pilot can be resumed.');
    pilot.status = 'open';
    const activePhase = pilot.phases.find((phase) => phase.key === pilot.currentPhaseKey);
    if (activePhase) activePhase.dueAt = new Date(now.getTime() + pilot.phaseWindowHours * 60 * 60 * 1000);
    pilot.transitions.push(transitionEvent('pilot_resumed', input.user, { fromStatus, toStatus: 'open', fromPhase, publicReason }));
  } else if (action === 'advance') {
    if (pilot.status !== 'open') throw new StructuredDebateError(409, 'DEBATE_TRANSITION_INVALID', 'Resume the pilot before advancing its phase.');
    const currentIndex = pilot.phases.findIndex((phase) => phase.key === pilot.currentPhaseKey);
    const current = pilot.phases[currentIndex];
    const next = pilot.phases[currentIndex + 1];
    if (!current || !next) throw new StructuredDebateError(409, 'DEBATE_FINAL_PHASE', 'Close the pilot after its final phase.');
    current.status = 'completed';
    current.completedAt = now;
    next.status = 'active';
    next.startedAt = now;
    next.dueAt = new Date(now.getTime() + pilot.phaseWindowHours * 60 * 60 * 1000);
    pilot.currentPhaseKey = next.key;
    pilot.transitions.push(transitionEvent('phase_advanced', input.user, {
      fromStatus, toStatus: 'open', fromPhase, toPhase: next.key, publicReason,
    }));
  } else if (action === 'close') {
    pilot.status = 'closed';
    pilot.closedAt = now;
    pilot.activeEntryKey = null;
    pilot.phases.forEach((phase) => {
      if (phase.status === 'active') {
        phase.status = 'completed';
        phase.completedAt = now;
      } else if (phase.status === 'upcoming') phase.status = 'skipped';
    });
    pilot.transitions.push(transitionEvent('pilot_closed', input.user, { fromStatus, toStatus: 'closed', fromPhase, publicReason }));
  } else {
    if (publicReason.length < 10) {
      throw new StructuredDebateError(400, 'DEBATE_CANCEL_REASON_REQUIRED', 'A public cancellation reason of at least 10 characters is required.');
    }
    pilot.status = 'cancelled';
    pilot.closedAt = now;
    pilot.activeEntryKey = null;
    pilot.phases.forEach((phase) => {
      if (phase.status === 'active' || phase.status === 'upcoming') phase.status = 'skipped';
    });
    pilot.transitions.push(transitionEvent('pilot_cancelled', input.user, { fromStatus, toStatus: 'cancelled', fromPhase, publicReason }));
  }
  pilot.editDate = now;
  await pilot.save();
  return buildPublicStructuredDebate(input.pilotId, input.user);
}
