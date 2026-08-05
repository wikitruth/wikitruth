'use strict';

import type { Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import appModForDb from '../app';
import type { AuthUser } from '../types/auth';
import type {
  StructuredDebateContributionRecord,
  StructuredDebateParticipantRecord,
  StructuredDebatePilotRecord,
  StructuredDebateStance,
} from '../types/structuredDebate';
import {
  canCreateStructuredDebate,
  canFacilitateStructuredDebate,
  structuredDebateEntryPath,
  structuredDebateUserId,
} from './structuredDebateAccess';
import { StructuredDebateError } from './structuredDebateErrors';

type ProjectionModels = {
  StructuredDebatePilot: Model<StructuredDebatePilotRecord>;
  StructuredDebateParticipant: Model<StructuredDebateParticipantRecord>;
  StructuredDebateContribution: Model<StructuredDebateContributionRecord>;
};

const db = (appModForDb as unknown as { db: { models: ProjectionModels } }).db.models;

export async function buildPublicStructuredDebate(
  pilotId: string,
  viewer?: AuthUser | null,
): Promise<Record<string, unknown>> {
  if (!isValidObjectId(pilotId)) {
    throw new StructuredDebateError(404, 'DEBATE_NOT_FOUND', 'Structured debate not found.');
  }
  const pilot = await db.StructuredDebatePilot.findById(pilotId).lean();
  if (!pilot) throw new StructuredDebateError(404, 'DEBATE_NOT_FOUND', 'Structured debate not found.');
  const [participants, contributions] = await Promise.all([
    db.StructuredDebateParticipant.find({ pilotId: pilot._id }).sort({ createDate: 1 }).lean(),
    db.StructuredDebateContribution.find({ pilotId: pilot._id }).sort({ createDate: 1 }).lean(),
  ]);
  const currentPhase = pilot.phases.find((phase) => phase.key === pilot.currentPhaseKey) || null;
  const currentPhaseContributions = contributions.filter((row) => row.phaseKey === pilot.currentPhaseKey);
  const currentTurnStance: StructuredDebateStance = currentPhaseContributions.length % 2 === 0 ? 'supports' : 'challenges';
  const viewerId = structuredDebateUserId(viewer);
  const viewerParticipant = participants.find((row) => String(row.userId) === viewerId) || null;
  const viewerHasContributed = Boolean(viewerParticipant && currentPhaseContributions.some(
    (row) => String(row.participantId) === String(viewerParticipant._id),
  ));
  const activeParticipantCount = participants.filter((row) => row.status === 'active').length;
  const canContribute = Boolean(
    viewerParticipant?.status === 'active'
    && pilot.status === 'open'
    && currentPhase?.status === 'active'
    && (!currentPhase?.dueAt || new Date(currentPhase.dueAt).getTime() >= Date.now())
    && viewerParticipant.stance === currentTurnStance
    && !viewerHasContributed,
  );

  const audit = [
    ...pilot.transitions.map((transition) => ({
      kind: 'transition', eventType: transition.eventType,
      label: transition.eventType.replace(/_/g, ' '), actor: transition.actorLabel || 'Facilitator',
      fromStatus: transition.fromStatus || null, toStatus: transition.toStatus || null,
      fromPhase: transition.fromPhase || null, toPhase: transition.toPhase || null,
      publicReason: transition.publicReason || '', occurredAt: new Date(transition.createDate).toISOString(),
    })),
    ...participants.flatMap((participant) => [
      {
        kind: 'participation', eventType: 'participant_joined', label: 'participant joined',
        actor: participant.publicUsername, stance: participant.stance,
        occurredAt: new Date(participant.consentedAt).toISOString(),
      },
      ...(participant.withdrewAt ? [{
        kind: 'participation', eventType: 'participant_withdrew', label: 'participant withdrew',
        actor: participant.publicUsername, stance: participant.stance,
        occurredAt: new Date(participant.withdrewAt).toISOString(),
      }] : []),
    ]),
    ...contributions.map((contribution) => ({
      kind: 'contribution', eventType: 'contribution_submitted', label: 'contribution submitted',
      actor: contribution.publicUsername, stance: contribution.stance, phaseKey: contribution.phaseKey,
      contributionId: String(contribution._id), occurredAt: new Date(contribution.createDate).toISOString(),
    })),
  ].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  const path = structuredDebateEntryPath(pilot.entryObjectName, pilot.entryId, pilot.entryFriendlyUrl);
  return {
    id: String(pilot._id), status: pilot.status, proposition: pilot.proposition,
    entry: {
      objectName: pilot.entryObjectName, id: String(pilot.entryId), title: pilot.entryTitle,
      path, discussionPath: `${path}/discussion`,
    },
    format: {
      version: pilot.formatVersion, consentVersion: pilot.consentVersion,
      participantLimit: pilot.participantLimit, phaseWindowHours: pilot.phaseWindowHours,
      contributionLimitPerParticipantPerPhase: pilot.contributionLimitPerParticipantPerPhase,
      evidenceRequired: pilot.evidenceRequired, alternatingStances: true, verdictImpact: 'none',
    },
    phases: pilot.phases.map((phase) => ({
      key: phase.key, label: phase.label, order: phase.order, status: phase.status,
      startedAt: phase.startedAt ? new Date(phase.startedAt).toISOString() : null,
      dueAt: phase.dueAt ? new Date(phase.dueAt).toISOString() : null,
      completedAt: phase.completedAt ? new Date(phase.completedAt).toISOString() : null,
    })),
    currentPhaseKey: pilot.currentPhaseKey,
    currentTurnStance,
    participants: participants.map((participant) => ({
      key: String(participant._id), publicUsername: participant.publicUsername,
      stance: participant.stance, status: participant.status,
      consentedAt: new Date(participant.consentedAt).toISOString(),
      withdrewAt: participant.withdrewAt ? new Date(participant.withdrewAt).toISOString() : null,
    })),
    contributions: contributions.map((contribution) => ({
      id: String(contribution._id), participantKey: String(contribution.participantId),
      publicUsername: contribution.publicUsername, stance: contribution.stance,
      phaseKey: contribution.phaseKey, contributionType: contribution.contributionType,
      content: contribution.content,
      evidenceLinks: contribution.evidenceLinks.map((link) => ({ url: link.url, label: link.label })),
      revisionNumber: contribution.revisionNumber,
      createDate: new Date(contribution.createDate).toISOString(), editDate: new Date(contribution.editDate).toISOString(),
    })),
    audit, reviewerSummary: null, verdictStatus: null,
    createdAt: new Date(pilot.createDate).toISOString(), updatedAt: new Date(pilot.editDate).toISOString(),
    closedAt: pilot.closedAt ? new Date(pilot.closedAt).toISOString() : null,
    viewer: {
      authenticated: Boolean(viewerId),
      canCreatePilot: canCreateStructuredDebate(viewer),
      canFacilitate: canFacilitateStructuredDebate(pilot, viewer),
      canJoin: Boolean(viewerId && pilot.status === 'open' && !viewerParticipant && activeParticipantCount < pilot.participantLimit),
      participant: viewerParticipant ? {
        key: String(viewerParticipant._id), publicUsername: viewerParticipant.publicUsername,
        stance: viewerParticipant.stance, status: viewerParticipant.status,
      } : null,
      canContribute,
      contributionBlockReason: canContribute ? null
        : !viewerId ? 'Sign in to join this pilot.'
          : !viewerParticipant ? 'Opt in and choose a stance before contributing.'
            : viewerParticipant.status !== 'active' ? 'You withdrew from this pilot.'
              : pilot.status !== 'open' ? `This pilot is ${pilot.status}.`
                : viewerHasContributed ? 'You already contributed in this phase.'
                  : viewerParticipant.stance !== currentTurnStance ? `Waiting for the ${currentTurnStance} turn.`
                    : 'This phase is awaiting facilitator review.',
    },
  };
}
