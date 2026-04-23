'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

import * as flowUtils from '../../utils/flowUtils';
import { logEntryEvent } from '../../services/entryEventsService';
import { notifySubscribers, createNotification } from '../../services/notificationsService';
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
  const objectType = Number(req.body?.type ?? req.body?.objectType);
  const id = String(req.body?.id || '').trim();
  if (!objectType || !id) {
    return null;
  }
  const objectName = String(req.body?.objectName || constants.OBJECT_ID_NAME_MAP?.[objectType] || '').trim();
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
    verdict?: { status?: unknown; reasoning?: unknown };
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
  const topicId = String(req.body?.topicId || req.body?.id || '').trim();
  const rawScope = String(req.body?.targetScope || req.body?.target || '').trim().toLowerCase();
  const username = String(req.body?.username || '').trim();
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

export = function (router: Router) {
  router.get('/entry', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureScreenerOrAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target query is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id).lean();
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry, target),
      screeningStatuses: getScreeningStatuses(),
      verdictStatuses: getVerdictStatuses(),
    });
  });

  router.put('/screening', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureScreenerOrAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const status = toNumber(req.body?.status ?? req.body?.screeningStatus);
    if (status === null || !isSupportedScreeningStatus(status)) {
      res.status(400).json({ success: false, message: 'A valid screening status is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    entry.screening = entry.screening || {};
    entry.screening.status = status;
    entry.editDate = new Date();
    entry.editUserId = req.user?.id || req.user?._id || entry.editUserId;
    await entry.save();

    const parent = flowUtils.getParent(entry, target.objectType);
    if (parent?.entryId && parent?.entryType) {
      await flowUtils.updateChildrenCount(parent.entryId, parent.entryType, target.objectType);
    }

    await logEntryEvent({
      eventType: 'moderation.screening.updated',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Screening status updated to ${status}`,
      payload: { status },
    });

    await notifySubscribers({
      target: {
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
      },
      type: 'screening',
      trigger: 'screening',
      title: 'Screening status updated',
      body: `${target.objectName} was moved to screening status ${status}.`,
      link: `/${target.objectName}s/entry/${encodeURIComponent(String(entry.friendlyUrl || target.id))}/${encodeURIComponent(target.id)}`,
      excludeUserIds: [String(req.user?.id || req.user?._id || '')],
      payload: { status },
    });

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
    });
  });

  router.put('/verdict', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    if (![constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument].includes(target.objectType)) {
      res.status(400).json({ success: false, message: 'Convert is only supported for topics and arguments' });
      return;
    }

    const status = toNumber(req.body?.status ?? req.body?.verdictStatus);
    const reasoning = String(req.body?.reasoning || req.body?.verdictReasoning || '').trim();
    if (status === null || !isSupportedVerdictStatus(status)) {
      res.status(400).json({ success: false, message: 'A valid verdict status is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    entry.verdict = {
      ...(entry.verdict || {}),
      status,
      editDate: Date.now(),
      editUserId: req.user?.id || req.user?._id || entry.editUserId,
      ...(reasoning ? { reasoning } : {}),
    };
    if (reasoning && typeof entry.verdictReasoning !== 'undefined') {
      entry.verdictReasoning = reasoning;
    }
    entry.editDate = new Date();
    entry.editUserId = req.user?.id || req.user?._id || entry.editUserId;
    await entry.save();

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.verdict.updated',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Verdict updated to ${status}`,
      payload: { status, reasoning },
    });

    await notifySubscribers({
      target: {
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
      },
      type: 'verdict',
      trigger: 'verdict',
      title: 'Verdict updated',
      body: `${target.objectName} verdict changed to ${constants.VERDICT_STATUS.getLabel(status) || status}.`,
      link: `/${target.objectName}s/entry/${encodeURIComponent(String(entry.friendlyUrl || target.id))}/${encodeURIComponent(target.id)}`,
      excludeUserIds: [String(req.user?.id || req.user?._id || '')],
      payload: { status, reasoning },
    });

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
    });
  });

  router.post('/convert-type', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const sourceTarget = parseModerationTarget(req);
    if (!sourceTarget) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    if (![constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument].includes(sourceTarget.objectType)) {
      res.status(400).json({ success: false, message: 'Only topics and arguments can be converted' });
      return;
    }

    const destinationTarget = resolveConversionTargetType(req.body?.targetType);
    if (!destinationTarget) {
      res.status(400).json({ success: false, message: 'A valid targetType is required (topic or argument)' });
      return;
    }
    if (destinationTarget.objectType === sourceTarget.objectType) {
      res.status(400).json({ success: false, message: 'Source and destination types are the same' });
      return;
    }

    const archiveSource = req.body?.archiveSource !== false;
    const reason = String(req.body?.reason || '').trim();

    const sourceModel = getDbModelByObjectType(sourceTarget.objectType);
    const destinationModel = getDbModelByObjectType(destinationTarget.objectType);
    if (!sourceModel || !destinationModel) {
      res.status(400).json({ success: false, message: 'Unsupported conversion target type' });
      return;
    }

    const sourceEntry = await sourceModel.findById(sourceTarget.id);
    if (!sourceEntry) {
      res.status(404).json({ success: false, message: 'Source entry not found' });
      return;
    }

    const now = new Date();
    const actorUserId = String(req.user?.id || req.user?._id || '');
    const actorUsername = String(req.user?.username || '');
    const source = sourceEntry.toObject ? sourceEntry.toObject() : sourceEntry;
    const sourceExtras = source?.extras && typeof source.extras === 'object' ? source.extras : {};

    const destinationPayload: Record<string, unknown> = {
      title: source?.title || '',
      content: source?.content || '',
      contentPreview: source?.contentPreview || String(source?.content || '').slice(0, 240),
      friendlyUrl: source?.friendlyUrl || '',
      referenceDate: source?.referenceDate || null,
      references: source?.references || '',
      topicTags: Array.isArray(source?.topicTags) ? source.topicTags : [],
      groupId: source?.groupId || null,
      categoryId: source?.categoryId || source?.ownerId || null,
      ownerId: source?.ownerId || null,
      ownerType: toNumber(source?.ownerType),
      createDate: source?.createDate || now,
      createUserId: source?.createUserId || actorUserId,
      editDate: now,
      editUserId: actorUserId || source?.editUserId || null,
      screening: source?.screening || { status: constants.SCREENING_STATUS.status0.code },
      private: Boolean(source?.private),
      ethicalStatus: source?.ethicalStatus || { hasValue: false },
      verdict: source?.verdict || {},
      tags: Array.isArray(source?.tags) ? source.tags : [],
      extras: {
        ...sourceExtras,
        convertedFrom: {
          objectType: sourceTarget.objectType,
          objectName: sourceTarget.objectName,
          objectId: String(sourceEntry._id),
          title: String(source?.title || ''),
          convertedAt: now.toISOString(),
          convertedBy: actorUserId,
          convertedByUsername: actorUsername,
          reason,
        },
      },
    };

    if (destinationTarget.objectType === constants.OBJECT_TYPES.topic) {
      destinationPayload.parentId = sourceTarget.objectType === constants.OBJECT_TYPES.topic
        ? source?.parentId || null
        : null;
      destinationPayload.contextTitle = source?.contextTitle || source?.title || '';
    } else {
      destinationPayload.parentId = sourceTarget.objectType === constants.OBJECT_TYPES.argument
        ? source?.parentId || null
        : null;
      destinationPayload.threadId = source?.threadId || null;
      destinationPayload.typeId = toNumber(source?.typeId) ?? constants.ARGUMENT_TYPES.factual;
      destinationPayload.against = Boolean(source?.against);
      destinationPayload.parentRelationship = toNumber(source?.parentRelationship);
    }

    const destinationEntry = await destinationModel.create(destinationPayload);
    const destinationId = String(destinationEntry?._id || '');
    const destinationFriendlyUrl = String(destinationEntry?.friendlyUrl || destinationId);
    const destinationPath = buildEntryPath({
      objectName: destinationTarget.objectName,
      id: destinationId,
      friendlyUrl: destinationFriendlyUrl,
    });

    const sourceHistory = Array.isArray(sourceExtras?.conversionHistory)
      ? sourceExtras.conversionHistory
      : [];
    sourceEntry.extras = {
      ...sourceExtras,
      convertedTo: {
        objectType: destinationTarget.objectType,
        objectName: destinationTarget.objectName,
        objectId: destinationId,
        friendlyUrl: destinationFriendlyUrl,
        convertedAt: now.toISOString(),
        convertedBy: actorUserId,
        convertedByUsername: actorUsername,
        reason,
      },
      conversionHistory: [
        ...sourceHistory,
        {
          from: {
            objectType: sourceTarget.objectType,
            objectName: sourceTarget.objectName,
            objectId: String(sourceEntry._id),
          },
          to: {
            objectType: destinationTarget.objectType,
            objectName: destinationTarget.objectName,
            objectId: destinationId,
            friendlyUrl: destinationFriendlyUrl,
          },
          convertedAt: now.toISOString(),
          convertedBy: actorUserId,
          convertedByUsername: actorUsername,
          reason,
        },
      ],
    };
    sourceEntry.editDate = now;
    sourceEntry.editUserId = actorUserId || sourceEntry.editUserId;
    if (archiveSource) {
      sourceEntry.screening = sourceEntry.screening || {};
      sourceEntry.screening.status = constants.SCREENING_STATUS.status3.code;
    }
    await sourceEntry.save();

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.entry.converted',
      objectType: sourceTarget.objectType,
      objectName: sourceTarget.objectName,
      objectId: sourceTarget.id,
      actorUserId,
      actorUsername,
      message: `Converted ${sourceTarget.objectName} to ${destinationTarget.objectName}`,
      payload: {
        archiveSource,
        reason,
        destination: {
          objectType: destinationTarget.objectType,
          objectName: destinationTarget.objectName,
          objectId: destinationId,
        },
      },
    });

    await notifySubscribers({
      target: {
        objectType: sourceTarget.objectType,
        objectName: sourceTarget.objectName,
        objectId: sourceTarget.id,
      },
      type: 'verdict',
      trigger: 'verdict',
      title: 'Entry converted',
      body: `${sourceTarget.objectName} converted to ${destinationTarget.objectName}.`,
      link: destinationPath,
      excludeUserIds: [actorUserId],
      payload: {
        sourceObjectType: sourceTarget.objectType,
        sourceObjectName: sourceTarget.objectName,
        sourceObjectId: sourceTarget.id,
        destinationObjectType: destinationTarget.objectType,
        destinationObjectName: destinationTarget.objectName,
        destinationObjectId: destinationId,
      },
    });

    res.json({
      success: true,
      source: {
        target: sourceTarget,
        entry: toModerationEntry(sourceEntry.toObject ? sourceEntry.toObject() : sourceEntry, sourceTarget),
        archived: archiveSource,
      },
      destination: {
        target: {
          objectType: destinationTarget.objectType,
          objectName: destinationTarget.objectName,
          id: destinationId,
        },
        entry: toModerationEntry(
          destinationEntry.toObject ? destinationEntry.toObject() : destinationEntry,
          {
            objectType: destinationTarget.objectType,
            objectName: destinationTarget.objectName,
            id: destinationId,
          }
        ),
        path: destinationPath,
      },
    });
  });

  router.get('/verdicts', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const objectType = toNumber(req.query.objectType);
    const verdictStatus = toNumber(req.query.status ?? req.query.verdictStatus);
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const search = String(req.query.q || '').trim();
    const regex = search ? new RegExp(escapeRegex(search), 'i') : null;

    const supportedTypes = [constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument];
    const targetTypes = objectType && supportedTypes.includes(objectType) ? [objectType] : supportedTypes;

    const allEntries: Record<string, unknown>[] = [];
    let total = 0;

    for (const targetType of targetTypes) {
      const dbModel = getDbModelByObjectType(targetType);
      if (!dbModel) {
        continue;
      }

      const query: Record<string, unknown> = {
        private: false,
      };
      if (verdictStatus !== null && isSupportedVerdictStatus(verdictStatus)) {
        query['verdict.status'] = verdictStatus;
      }
      if (regex) {
        query.title = regex;
      }

      const [count, entries] = await Promise.all([
        dbModel.countDocuments(query),
        dbModel
          .find(query)
          .sort({ editDate: -1 })
          .limit(limit * page)
          .lean(),
      ]);

      total += Number(count || 0);
      const objectName = String(constants.OBJECT_ID_NAME_MAP?.[targetType] || '').trim();
      entries.forEach((entry: Record<string, unknown>) => {
        allEntries.push(toModerationEntry(entry, { objectType: targetType, objectName, id: String(entry._id || '') }));
      });
    }

    allEntries.sort((a, b) => {
      const left = new Date(String((a as Record<string, unknown>).editDate || 0)).getTime();
      const right = new Date(String((b as Record<string, unknown>).editDate || 0)).getTime();
      return right - left;
    });

    const start = (page - 1) * limit;
    const pagedEntries = allEntries.slice(start, start + limit);
    const entriesWithVoteSummary = await Promise.all(
      pagedEntries.map(async (entry) => ({
        ...entry,
        voteSummary: await buildVoteSummary(entry),
      }))
    );

    res.json({
      success: true,
      entries: entriesWithVoteSummary,
      page,
      limit,
      total,
      verdictStatuses: getVerdictStatuses(),
    });
  });

  router.post('/verdicts/bulk', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const updates = Array.isArray(req.body?.updates) ? (req.body.updates as Array<Record<string, unknown>>) : [];
    if (!updates.length) {
      res.status(400).json({ success: false, message: 'updates array is required' });
      return;
    }
    if (updates.length > 100) {
      res.status(400).json({ success: false, message: 'Bulk update is limited to 100 records' });
      return;
    }

    const userId = req.user?.id || req.user?._id;
    const results: Array<{ id: string; success: boolean; message?: string }> = [];

    for (const update of updates) {
      const id = String(update.id || '').trim();
      const objectType = toNumber(update.type ?? update.objectType);
      const status = toNumber(update.status ?? update.verdictStatus);
      const reasoning = String(update.reasoning || '').trim();

      if (!id || !objectType || status === null || !isSupportedVerdictStatus(status)) {
        results.push({
          id: id || 'unknown',
          success: false,
          message: 'Invalid id/type/status',
        });
        continue;
      }

      const dbModel = getDbModelByObjectType(objectType);
      if (!dbModel) {
        results.push({ id, success: false, message: 'Unsupported object type' });
        continue;
      }

      const entry = await dbModel.findById(id);
      if (!entry) {
        results.push({ id, success: false, message: 'Entry not found' });
        continue;
      }

      entry.verdict = {
        ...(entry.verdict || {}),
        status,
        editDate: Date.now(),
        editUserId: userId || entry.editUserId,
        ...(reasoning ? { reasoning } : {}),
      };
      if (reasoning && typeof entry.verdictReasoning !== 'undefined') {
        entry.verdictReasoning = reasoning;
      }
      entry.editDate = new Date();
      entry.editUserId = userId || entry.editUserId;
      await entry.save();

      await logEntryEvent({
        scope: 'privileged',
        eventType: 'moderation.verdict.bulk-updated',
        objectType,
        objectId: id,
        actorUserId: String(req.user?.id || req.user?._id || ''),
        actorUsername: String(req.user?.username || ''),
        message: `Bulk verdict update to ${status}`,
        payload: { status, reasoning },
      });

      results.push({ id, success: true });
    }

    res.json({
      success: true,
      results,
    });
  });

  router.post('/take-ownership', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    entry.createUserId = req.user?.id || req.user?._id || entry.createUserId;
    entry.editUserId = req.user?.id || req.user?._id || entry.editUserId;
    entry.editDate = new Date();
    await entry.save();

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.take-ownership',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: 'Entry ownership claimed by moderator',
    });

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
    });
  });

  router.post('/delete', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findByIdAndDelete(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    const parent = flowUtils.getParent(entry, target.objectType);
    if (parent?.entryId && parent?.entryType) {
      await flowUtils.updateChildrenCount(parent.entryId, parent.entryType, target.objectType);
    }

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.delete',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: 'Entry deleted by moderator',
      payload: {
        title: entry?.title || '',
      },
    });

    res.json({
      success: true,
      target,
      deleted: true,
    });
  });

  router.post('/ownership-migration', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const migration = parseOwnershipMigrationRequest(req);
    if (!migration.topicId) {
      res.status(400).json({ success: false, message: 'A topicId is required for ownership migration' });
      return;
    }

    if (!migration.targetScope) {
      res.status(400).json({ success: false, message: 'targetScope must be either "public" or "journal"' });
      return;
    }

    if (migration.targetScope === 'public' && migration.username) {
      res.status(400).json({ success: false, message: 'username is only valid for journal ownership migrations' });
      return;
    }

    const topic = await db.Topic.findById(migration.topicId);
    if (!topic) {
      res.status(404).json({ success: false, message: 'Topic not found' });
      return;
    }

    if (topic.parentId) {
      res.status(400).json({
        success: false,
        message: 'Ownership migration only supports root topics to prevent partial subtree drifts',
      });
      return;
    }

    if (topic.groupId || topic.ownerType === constants.OBJECT_TYPES.group) {
      res.status(409).json({
        success: false,
        message: 'Group-scoped topics must use group membership workflows instead of journal/public migration',
      });
      return;
    }

    let targetOwnerId: string | null = null;
    let targetOwnerType = -1;
    let targetPrivate = false;
    let targetUser: { _id: string; username: string } | null = null;

    if (migration.targetScope === 'journal') {
      if (!migration.username) {
        res.status(400).json({ success: false, message: 'username is required when targetScope is journal' });
        return;
      }

      targetUser = await db.User.findOne({ username: migration.username }).select('_id username').lean();
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'Journal owner account not found' });
        return;
      }

      // Policy check: require the journal target user to be the original creator to avoid implicit cross-user transfer.
      if (!areIdsEqual(topic.createUserId, targetUser._id)) {
        res.status(409).json({
          success: false,
          message:
            'Journal migration target must match the original topic creator. Use take-ownership first if transfer is intended.',
        });
        return;
      }

      targetOwnerId = String(targetUser._id);
      targetOwnerType = constants.OBJECT_TYPES.user;
      targetPrivate = true;
    }

    const unchanged =
      Boolean(topic.private) === targetPrivate &&
      Number(topic.ownerType) === targetOwnerType &&
      areIdsEqual(topic.ownerId, targetOwnerId);
    if (unchanged) {
      res.status(409).json({ success: false, message: 'Topic already matches requested ownership scope' });
      return;
    }

    const now = new Date();
    const actingUserId = req.user?.id || req.user?._id || topic.editUserId;
    const subtreeFilter = { $or: [{ _id: topic._id }, { categoryId: topic._id }] };

    await db.Topic.updateMany(subtreeFilter, {
      $set: {
        private: targetPrivate,
        ownerType: targetOwnerType,
        ownerId: targetOwnerId,
        groupId: null,
        editDate: now,
        editUserId: actingUserId,
      },
    });

    const updatedRootTopic = await db.Topic.findById(topic._id);
    if (updatedRootTopic) {
      await flowUtils.syncChildren(updatedRootTopic, { entryType: constants.OBJECT_TYPES.topic });
    }

    const impactedTopics = await db.Topic.find(subtreeFilter).select('_id').lean();
    const countTasks = impactedTopics.map((entry: { _id: string }) => ({
      entryId: entry._id,
      entryType: constants.OBJECT_TYPES.topic,
      specificEntryType: null,
    }));
    await flowUtils.updateChildrenCountBatch(countTasks, { transactional: true });

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.ownership-migration',
      objectType: constants.OBJECT_TYPES.topic,
      objectName: 'topic',
      objectId: String(topic._id),
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Ownership migration to ${migration.targetScope}`,
      payload: {
        topicId: String(topic._id),
        targetScope: migration.targetScope,
        username: targetUser?.username || null,
      },
    });

    res.json({
      success: true,
      migration: {
        topicId: String(topic._id),
        targetScope: migration.targetScope,
        username: targetUser?.username || null,
        migratedTopicCount: impactedTopics.length,
      },
    });
  });

  router.post('/verdict-votes', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const verdictStatus = toNumber(req.body?.status ?? req.body?.verdictStatus);
    if (verdictStatus === null || !isSupportedVerdictStatus(verdictStatus)) {
      res.status(400).json({ success: false, message: 'A valid verdict status is required' });
      return;
    }

    const rationale = String(req.body?.rationale || '').trim();
    const voterUserId = String(req.user?._id || req.user?.id || '');
    const voterUsername = String(req.user?.username || '');

    const vote = await db.VerdictVote.findOneAndUpdate(
      {
        objectType: target.objectType,
        objectId: target.id,
        voterUserId: voterUserId,
      },
      {
        $set: {
          objectType: target.objectType,
          objectName: target.objectName,
          objectId: target.id,
          verdictStatus: verdictStatus,
          rationale: rationale,
          voterUserId: voterUserId,
          voterUsername: voterUsername,
          editDate: new Date(),
        },
        $setOnInsert: {
          createDate: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await logEntryEvent({
      eventType: 'moderation.verdict.vote',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: voterUserId,
      actorUsername: voterUsername,
      message: `Verdict vote submitted for status ${verdictStatus}`,
      payload: { verdictStatus, rationale },
    });

    const votes = await db.VerdictVote.find({
      objectType: target.objectType,
      objectId: target.id,
    }).lean();
    const consensus = computeConsensus(votes);

    res.json({
      success: true,
      vote,
      summary: {
        threshold: consensus.threshold,
        totalVotes: consensus.totalVotes,
        consensusReached: consensus.reached,
        consensusStatus: consensus.leadingStatus,
      },
    });
  });

  router.get('/verdict-votes', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const votes = await db.VerdictVote.find({
      objectType: target.objectType,
      objectId: target.id,
    })
      .sort({ createDate: 1 })
      .lean();

    const consensus = computeConsensus(votes);

    res.json({
      success: true,
      votes,
      summary: {
        threshold: consensus.threshold,
        totalVotes: consensus.totalVotes,
        consensusReached: consensus.reached,
        consensusStatus: consensus.leadingStatus,
      },
    });
  });

  router.post('/signals', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user?._id && !req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const signalType = String(req.body?.signalType || '').trim();
    const supportedSignalTypes = ['controversial', 'incorrect_verdict', 'needs_reevaluation', 'wrong_category'];
    if (!supportedSignalTypes.includes(signalType)) {
      res.status(400).json({ success: false, message: 'Unsupported signalType' });
      return;
    }

    const note = String(req.body?.note || '').trim();
    const signal = await db.ReaderSignal.create({
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      signalType,
      note,
      status: 'open',
      createUserId: String(req.user?._id || req.user?.id || ''),
      createUsername: String(req.user?.username || ''),
      createDate: new Date(),
      editDate: new Date(),
    });

    await logEntryEvent({
      eventType: 'moderation.reader-signal.created',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?._id || req.user?.id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Reader signal submitted: ${signalType}`,
      payload: { signalType, note },
    });

    const reviewerUsers = await db.User.find({
      $or: [{ 'roles.reviewer': true }, { 'roles.admin': { $ne: null } }],
    })
      .select('_id')
      .lean();

    await Promise.all(
      reviewerUsers
        .map((reviewer: { _id?: unknown }) => String(reviewer._id || '').trim())
        .filter(Boolean)
        .map((reviewerId: string) =>
          createNotification({
            userId: reviewerId,
            type: 'reader_signal',
            title: 'New reader signal',
            body: `${target.objectName} was flagged as ${signalType.replace('_', ' ')}.`,
            link: `/admin/moderation/signals?type=signals`,
            target: {
              objectType: target.objectType,
              objectName: target.objectName,
              objectId: target.id,
            },
            payload: { signalId: String(signal._id || '') },
          })
        )
    );

    res.status(201).json({
      success: true,
      signal,
    });
  });

  router.get('/signals', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }

    const status = String(req.query.status || '').trim();
    const signalType = String(req.query.signalType || '').trim();
    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }
    if (signalType) {
      query.signalType = signalType;
    }

    const signals = await db.ReaderSignal.find(query).sort({ createDate: -1 }).limit(200).lean();
    res.json({
      success: true,
      signals,
    });
  });

  router.put('/signals/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }

    const signal = await db.ReaderSignal.findById(req.params.id);
    if (!signal) {
      res.status(404).json({ success: false, message: 'Signal not found' });
      return;
    }

    const status = String(req.body?.status || '').trim();
    const resolutionNote = String(req.body?.resolutionNote || '').trim();
    if (status) {
      signal.status = status;
    }
    if (resolutionNote) {
      signal.resolutionNote = resolutionNote;
    }
    signal.assignedUserId = String(req.user?._id || req.user?.id || '');
    signal.editDate = new Date();
    await signal.save();

    res.json({
      success: true,
      signal: signal.toObject(),
    });
  });

  router.post('/appeals', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user?._id && !req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const reasonType = String(req.body?.reasonType || 'general').trim();
    const note = String(req.body?.note || '').trim();
    if (!note || note.length < 6) {
      res.status(400).json({ success: false, message: 'Appeal note must be at least 6 characters' });
      return;
    }

    const appeal = await db.Appeal.create({
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      reasonType,
      note,
      status: 'open',
      createUserId: String(req.user?._id || req.user?.id || ''),
      createUsername: String(req.user?.username || ''),
      createDate: new Date(),
      editDate: new Date(),
    });

    await logEntryEvent({
      eventType: 'moderation.appeal.created',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?._id || req.user?.id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Appeal created (${reasonType})`,
      payload: { reasonType, note },
    });

    res.status(201).json({
      success: true,
      appeal,
    });
  });

  router.get('/appeals', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }

    const status = String(req.query.status || '').trim();
    const reasonType = String(req.query.reasonType || '').trim();
    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }
    if (reasonType) {
      query.reasonType = reasonType;
    }

    const appeals = await db.Appeal.find(query).sort({ createDate: -1 }).limit(200).lean();
    res.json({
      success: true,
      appeals,
    });
  });

  router.put('/appeals/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }

    const appeal = await db.Appeal.findById(req.params.id);
    if (!appeal) {
      res.status(404).json({ success: false, message: 'Appeal not found' });
      return;
    }

    const status = String(req.body?.status || '').trim();
    const resolutionNote = String(req.body?.resolutionNote || '').trim();
    if (status) {
      appeal.status = status;
    }
    if (resolutionNote) {
      appeal.resolutionNote = resolutionNote;
    }
    appeal.assignedReviewerId = String(req.user?._id || req.user?.id || '');
    appeal.editDate = new Date();
    await appeal.save();

    res.json({
      success: true,
      appeal: appeal.toObject(),
    });
  });
};
