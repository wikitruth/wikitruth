'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  findDuplicateCandidates,
  mergeEntries,
} from '../../services/entryMergeService';
import {
  ensureModerator,
  parseModerationTarget,
  toNumber,
} from './moderationShared';

export function registerModerationDuplicateRoutes(router: Router): void {
  router.get('/duplicates', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureModerator(req, res)) {
      return;
    }
    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A duplicate target is required' });
      return;
    }
    const candidates = await findDuplicateCandidates(target.objectType, target.id);
    res.json({ success: true, target, candidates });
  });

  router.post('/merge', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureModerator(req, res)) {
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const objectType = toNumber(body.objectType ?? body.type);
    const sourceId = String(body.sourceId || '').trim();
    const targetId = String(body.targetId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!objectType || !sourceId || !targetId) {
      res.status(400).json({ success: false, message: 'objectType, sourceId, and targetId are required' });
      return;
    }

    try {
      const merge = await mergeEntries({
        objectType,
        sourceId,
        targetId,
        sourceEditDate: String(body.sourceEditDate || '').trim() || undefined,
        targetEditDate: String(body.targetEditDate || '').trim() || undefined,
        reason,
        actor: {
          id: String(req.user?.id || req.user?._id || ''),
          username: String(req.user?.username || ''),
        },
      });
      res.json({ success: true, merge });
    } catch (error) {
      res.status(409).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unable to merge entries',
      });
    }
  });
}

