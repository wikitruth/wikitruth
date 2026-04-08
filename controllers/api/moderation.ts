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

function toModerationEntry(entry: any, target: ModerationTarget): Record<string, unknown> {
  return {
    _id: entry?._id,
    title: entry?.title || entry?.title2 || '',
    friendlyUrl: entry?.friendlyUrl || '',
    objectType: target.objectType,
    objectName: target.objectName,
    screening: {
      status: toNumber(entry?.screening?.status),
    },
    verdict: {
      status: toNumber(entry?.verdict?.status),
    },
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
    };
    entry.editDate = new Date();
    entry.editUserId = req.user?.id || req.user?._id || entry.editUserId;
    await entry.save();

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
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
