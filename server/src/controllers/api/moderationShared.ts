'use strict';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  bodyOf,
  type ModerationObjectBodyContract,
  type ModerationOwnershipBodyContract,
} from '../../types/controllerContracts';

import * as flowUtils from '../../utils/flowUtils';
import constants from '../../models/constants';

import appModForDb from '../../app';

type ModerationTarget = {
  objectType: number;
  objectName: string;
  id: string;
};

type StatusRow = {
  code: number;
  text: string;
};

const VERDICT_STATUS_ORDER: number[] = [
  constants.VERDICT_STATUS.pending,
  constants.VERDICT_STATUS.status_true,
  constants.VERDICT_STATUS.status_false,
  constants.VERDICT_STATUS.claim,
  constants.VERDICT_STATUS.most_likely,
  constants.VERDICT_STATUS.very_likely,
  constants.VERDICT_STATUS.likely,
  constants.VERDICT_STATUS.makes_sense,
  constants.VERDICT_STATUS.unlikely,
  constants.VERDICT_STATUS.very_unlikely,
  constants.VERDICT_STATUS.most_likely_false,
  constants.VERDICT_STATUS.misleading_invalid,
];

const VERDICT_CHANNEL_STATUSES = {
  factual: ['pending', 'supported', 'refuted', 'mixed', 'insufficient_evidence'],
  ethical: ['pending', 'permissible', 'impermissible', 'contested', 'not_applicable'],
} as const;

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
function canPlayRole(req: WikitruthRequest, role: string): boolean {
  return Boolean(req.user && req.user.canPlayRoleOf && req.user.canPlayRoleOf(role));
}

function ensureScreenerOrAdmin(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (canPlayRole(req, 'screener') || canPlayRole(req, 'admin')) {
    return true;
  }
  res.status(403).json({ success: false, message: 'Screener or admin privileges required' });
  return false;
}

function ensureAdmin(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (canPlayRole(req, 'admin')) {
    return true;
  }
  res.status(403).json({ success: false, message: 'Admin privileges required' });
  return false;
}

function ensureReviewerOrAdmin(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (canPlayRole(req, 'reviewer') || canPlayRole(req, 'admin')) {
    return true;
  }
  res.status(403).json({ success: false, message: 'Reviewer or admin privileges required' });
  return false;
}

function ensureModerator(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (canPlayRole(req, 'screener') || canPlayRole(req, 'reviewer') || canPlayRole(req, 'admin')) {
    return true;
  }
  res.status(403).json({ success: false, message: 'Screener, reviewer, or admin privileges required' });
  return false;
}

function getDbModelByObjectType(objectType: number): Record<string, any> {
  return flowUtils.getDbModelByObjectType(objectType);
}

function parseTargetFromOwnerQuery(req: WikitruthRequest): ModerationTarget | null {
  const ownerQuery = flowUtils.createOwnerQueryFromQuery(req) as {
    ownerType?: unknown;
    ownerId?: unknown;
  };
  const objectType = Number(ownerQuery.ownerType);
  const id = String(ownerQuery.ownerId || '').trim();
  if (!objectType || !id) {
    return null;
  }
  const objectName = String(constants.OBJECT_ID_NAME_MAP?.[objectType] || '').trim();
  if (!objectName) {
    return null;
  }
  return { objectType, objectName, id };
}

function parseTargetFromBody(req: WikitruthRequest): ModerationTarget | null {
  const body = bodyOf<ModerationObjectBodyContract>(req);
  const objectType = Number(body.type ?? body.objectType);
  const id = String(body.id || '').trim();
  if (!objectType || !id) {
    return null;
  }
  const objectName = String(body.objectName || constants.OBJECT_ID_NAME_MAP?.[objectType] || '').trim();
  if (!objectName) {
    return null;
  }
  return { objectType, objectName, id };
}

function parseModerationTarget(req: WikitruthRequest): ModerationTarget | null {
  return parseTargetFromOwnerQuery(req) || parseTargetFromBody(req);
}

function getScreeningStatuses(): StatusRow[] {
  return Object.values(constants.SCREENING_STATUS || {})
    .filter((status): status is StatusRow => {
      return Boolean(
        status &&
          typeof status === 'object' &&
          typeof (status as { code?: unknown }).code === 'number' &&
          typeof (status as { text?: unknown }).text === 'string'
      );
    })
    .sort((a, b) => a.code - b.code);
}

function getVerdictStatuses(): Array<{ code: number; text: string }> {
  return VERDICT_STATUS_ORDER.map((code) => ({
    code,
    text: String(constants.VERDICT_STATUS.getLabel(code) || code),
  }));
}

function getVerdictChannelStatuses(): typeof VERDICT_CHANNEL_STATUSES {
  return VERDICT_CHANNEL_STATUSES;
}

function mapLegacyVerdictToFactual(status: number): (typeof VERDICT_CHANNEL_STATUSES.factual)[number] {
  const category = constants.VERDICT_STATUS.getCategory(status);
  if (category === constants.VERDICT_STATUS.categories.true) {
    return 'supported';
  }
  if (category === constants.VERDICT_STATUS.categories.false) {
    return 'refuted';
  }
  if (status === constants.VERDICT_STATUS.claim) {
    return 'insufficient_evidence';
  }
  return 'pending';
}

function mapFactualVerdictToLegacy(status: string): number {
  if (status === 'supported') {
    return constants.VERDICT_STATUS.status_true;
  }
  if (status === 'refuted') {
    return constants.VERDICT_STATUS.status_false;
  }
  if (status === 'mixed' || status === 'insufficient_evidence') {
    return constants.VERDICT_STATUS.claim;
  }
  return constants.VERDICT_STATUS.pending;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = toNumber(value);
  if (parsed === null || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toModerationEntry(entry: Record<string, unknown> | null | undefined, target: ModerationTarget): Record<string, unknown> {
  const e = (entry || {}) as Record<string, unknown> & {
    screening?: { status?: unknown };
    verdict?: { status?: unknown; reasoning?: unknown; editDate?: unknown; editUserId?: unknown };
    verdicts?: {
      factual?: Record<string, unknown>;
      ethical?: Record<string, unknown>;
    };
  };
  return {
    _id: e._id,
    title: e.title || e.title2 || '',
    friendlyUrl: e.friendlyUrl || '',
    objectType: target.objectType,
    objectName: target.objectName,
    createDate: e.createDate || null,
    editDate: e.editDate || null,
    screening: {
      status: toNumber(e.screening?.status),
    },
    verdict: {
      status: toNumber(e.verdict?.status),
      reasoning: e.verdict?.reasoning || e.verdictReasoning || null,
    },
    verdictReasoning: e.verdict?.reasoning || e.verdictReasoning || null,
    verdictChannels: {
      factual: {
        status: e.verdicts?.factual?.status || mapLegacyVerdictToFactual(Number(e.verdict?.status || 0)),
        reasoning: e.verdicts?.factual?.reasoning || e.verdict?.reasoning || e.verdictReasoning || '',
        evidenceRefs: e.verdicts?.factual?.evidenceRefs || [],
        editDate: e.verdicts?.factual?.editDate || e.verdict?.editDate || null,
        editUserId: e.verdicts?.factual?.editUserId || e.verdict?.editUserId || null,
      },
      ethical: {
        status: e.verdicts?.ethical?.status || 'pending',
        reasoning: e.verdicts?.ethical?.reasoning || '',
        framework: e.verdicts?.ethical?.framework || '',
        evidenceRefs: e.verdicts?.ethical?.evidenceRefs || [],
        editDate: e.verdicts?.ethical?.editDate || null,
        editUserId: e.verdicts?.ethical?.editUserId || null,
      },
    },
    ownerId: e.ownerId || null,
    ownerType: toNumber(e.ownerType),
    parentId: e.parentId || null,
    questionId: e.questionId || null,
  };
}

function areIdsEqual(left: unknown, right: unknown): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return String(left) === String(right);
}

function parseOwnershipMigrationRequest(req: WikitruthRequest): {
  topicId: string;
  targetScope: 'public' | 'journal' | '';
  username: string;
} {
  const body = bodyOf<ModerationOwnershipBodyContract>(req);
  const topicId = String(body.topicId || body.id || '').trim();
  const rawScope = String(body.targetScope || body.target || '').trim().toLowerCase();
  const username = String(body.username || '').trim();
  const targetScope = rawScope === 'diary'
    ? 'journal'
    : rawScope === 'public' || rawScope === 'journal'
      ? rawScope
      : '';
  return {
    topicId,
    targetScope,
    username,
  };
}

function isSupportedScreeningStatus(status: number): boolean {
  return getScreeningStatuses().some((row) => row.code === status);
}

function isSupportedVerdictStatus(status: number): boolean {
  return VERDICT_STATUS_ORDER.includes(status);
}

function resolveTargetByObjectType(objectType: number): { objectType: number; objectName: string } | null {
  if (!objectType) {
    return null;
  }
  const objectName = String(constants.OBJECT_ID_NAME_MAP?.[objectType] || '').trim();
  if (!objectName) {
    return null;
  }
  return {
    objectType,
    objectName,
  };
}

function resolveConversionTargetType(raw: unknown): { objectType: number; objectName: string } | null {
  const normalized = String(raw || '').trim().toLowerCase();
  if (normalized === 'topic') {
    return resolveTargetByObjectType(constants.OBJECT_TYPES.topic);
  }
  if (normalized === 'argument' || normalized === 'fact') {
    return resolveTargetByObjectType(constants.OBJECT_TYPES.argument);
  }
  return null;
}

function buildEntryPath(target: { objectName: string; id: string; friendlyUrl?: string | null }): string {
  const encodedId = encodeURIComponent(String(target.id || ''));
  const encodedFriendly = encodeURIComponent(String(target.friendlyUrl || target.id || ''));
  switch (target.objectName) {
    case 'topic':
      return `/topics/entry/${encodedFriendly}/${encodedId}`;
    case 'argument':
      return `/arguments/entry/${encodedFriendly}/${encodedId}`;
    case 'question':
      return `/questions/entry/${encodedFriendly}/${encodedId}`;
    case 'answer':
      return `/answers/entry/${encodedId}`;
    case 'issue':
      return `/issues/entry/${encodedFriendly}/${encodedId}`;
    case 'opinion':
      return `/opinions/entry/${encodedFriendly}/${encodedId}`;
    case 'artifact':
      return `/artifacts/entry/${encodedFriendly}/${encodedId}`;
    default:
      return `/${target.objectName}s/entry/${encodedFriendly}/${encodedId}`;
  }
}

function computeConsensus(votes: Array<{ verdictStatus: number; voterUserId?: unknown }>): {
  threshold: number;
  totalVotes: number;
  leadingStatus: number | null;
  leadingCount: number;
  reached: boolean;
} {
  const totalVotes = votes.length;
  const threshold = Math.max(2, Math.ceil(3 * (2 / 3)));
  if (!totalVotes) {
    return {
      threshold,
      totalVotes,
      leadingStatus: null,
      leadingCount: 0,
      reached: false,
    };
  }

  const byStatus = new Map<number, number>();
  votes.forEach((vote) => {
    const status = Number(vote.verdictStatus);
    if (!Number.isFinite(status)) {
      return;
    }
    byStatus.set(status, Number(byStatus.get(status) || 0) + 1);
  });

  let leadingStatus: number | null = null;
  let leadingCount = 0;
  byStatus.forEach((count, status) => {
    if (count > leadingCount) {
      leadingStatus = status;
      leadingCount = count;
    }
  });

  return {
    threshold,
    totalVotes,
    leadingStatus,
    leadingCount,
    reached: leadingCount >= threshold,
  };
}

async function buildVoteSummary(entry: Record<string, unknown>): Promise<{
  totalVotes: number;
  threshold: number;
  consensusReached: boolean;
  consensusStatus: number | null;
  counts: Array<{ status: number; count: number }>;
}> {
  const objectType = Number(entry.objectType || 0);
  const objectId = String(entry._id || '');
  if (!objectType || !objectId) {
    return {
      totalVotes: 0,
      threshold: 2,
      consensusReached: false,
      consensusStatus: null,
      counts: [],
    };
  }

  const votes = await db.VerdictVote.find({
    objectType,
    objectId,
  }).lean();

  const consensus = computeConsensus(votes);
  const statusCountMap = new Map<number, number>();
  votes.forEach((vote: { verdictStatus: number }) => {
    const status = Number(vote.verdictStatus);
    statusCountMap.set(status, Number(statusCountMap.get(status) || 0) + 1);
  });

  return {
    totalVotes: consensus.totalVotes,
    threshold: consensus.threshold,
    consensusReached: consensus.reached,
    consensusStatus: consensus.leadingStatus,
    counts: Array.from(statusCountMap.entries()).map(([status, count]) => ({ status, count })),
  };
}

export {
  db,
  ensureScreenerOrAdmin,
  ensureAdmin,
  ensureReviewerOrAdmin,
  ensureModerator,
  parseModerationTarget,
  getDbModelByObjectType,
  getScreeningStatuses,
  getVerdictStatuses,
  getVerdictChannelStatuses,
  mapLegacyVerdictToFactual,
  mapFactualVerdictToLegacy,
  toNumber,
  toPositiveInt,
  escapeRegex,
  toModerationEntry,
  areIdsEqual,
  parseOwnershipMigrationRequest,
  isSupportedScreeningStatus,
  isSupportedVerdictStatus,
  resolveConversionTargetType,
  buildEntryPath,
  computeConsensus,
  buildVoteSummary,
};

export type {
  ModerationTarget,
};
