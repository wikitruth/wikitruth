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

const db = require('../../app').db.models as Record<string, unknown>;

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
};
