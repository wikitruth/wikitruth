'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const constants = require('../../models/constants');
const flowUtils = require('../../utils/flowUtils');

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

const db = require('../../app').db.models as Record<string, any>;

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

function getDbModelByObjectType(objectType: number): any {
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

function toModerationEntry(entry: any, target: ModerationTarget): Record<string, unknown> {
  return {
    _id: entry?._id,
    title: entry?.title || entry?.title2 || '',
    friendlyUrl: entry?.friendlyUrl || '',
    objectType: target.objectType,
    objectName: target.objectName,
    createDate: entry?.createDate || null,
    editDate: entry?.editDate || null,
    screening: {
      status: toNumber(entry?.screening?.status),
    },
    verdict: {
      status: toNumber(entry?.verdict?.status),
      reasoning: entry?.verdict?.reasoning || entry?.verdictReasoning || null,
    },
    verdictReasoning: entry?.verdict?.reasoning || entry?.verdictReasoning || null,
    ownerId: entry?.ownerId || null,
    ownerType: toNumber(entry?.ownerType),
    parentId: entry?.parentId || null,
    questionId: entry?.questionId || null,
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
  targetScope: 'public' | 'diary' | '';
  username: string;
} {
  const topicId = String(req.body?.topicId || req.body?.id || '').trim();
  const rawScope = String(req.body?.targetScope || req.body?.target || '').trim().toLowerCase();
  const username = String(req.body?.username || '').trim();
  const targetScope = rawScope === 'public' || rawScope === 'diary' ? rawScope : '';
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

module.exports = function (router: Router) {
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

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
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
      entries.forEach((entry: any) => {
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

    res.json({
      success: true,
      entries: pagedEntries,
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
      res.status(400).json({ success: false, message: 'targetScope must be either "public" or "diary"' });
      return;
    }

    if (migration.targetScope === 'public' && migration.username) {
      res.status(400).json({ success: false, message: 'username is only valid for diary ownership migrations' });
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
        message: 'Group-scoped topics must use group membership workflows instead of diary/public migration',
      });
      return;
    }

    let targetOwnerId: string | null = null;
    let targetOwnerType = -1;
    let targetPrivate = false;
    let targetUser: { _id: string; username: string } | null = null;

    if (migration.targetScope === 'diary') {
      if (!migration.username) {
        res.status(400).json({ success: false, message: 'username is required when targetScope is diary' });
        return;
      }

      targetUser = await db.User.findOne({ username: migration.username }).select('_id username').lean();
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'Diary owner account not found' });
        return;
      }

      // Policy check: require the diary target user to be the original creator to avoid implicit cross-user transfer.
      if (!areIdsEqual(topic.createUserId, targetUser._id)) {
        res.status(409).json({
          success: false,
          message:
            'Diary migration target must match the original topic creator. Use take-ownership first if transfer is intended.',
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
};
