'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

import {
  listTimelineEvents,
  getTimelineBuckets,
} from '../../services/entryEventsService';
import { listEntryRevisions } from '../../services/entryRevisionService';
import constants from '../../models/constants';

function resolveObjectType(objectName: string | undefined, objectType: unknown): number {
  const direct = Number(objectType);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const normalized = String(objectName || '').trim();
  return Number(constants.OBJECT_TYPES?.[normalized] || 0);
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const objectName = String(req.query.objectName || '').trim();
    const objectId = String(req.query.id || req.query.objectId || '').trim();
    const objectType = resolveObjectType(objectName, req.query.objectType);
    if (!objectType || !objectId) {
      res.status(400).json({ success: false, message: 'objectName/objectType and id are required' });
      return;
    }

    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const eventTypes = String(req.query.eventTypes || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await listTimelineEvents({
      objectType,
      objectId,
      page,
      limit,
      eventTypes,
    });

    res.json({
      success: true,
      events: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  router.get('/visualization', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const objectName = String(req.query.objectName || '').trim();
    const objectId = String(req.query.id || req.query.objectId || '').trim();
    const objectType = resolveObjectType(objectName, req.query.objectType);
    if (!objectType || !objectId) {
      res.status(400).json({ success: false, message: 'objectName/objectType and id are required' });
      return;
    }

    const days = Math.min(toPositiveInt(req.query.days, 60), 365);
    const buckets = await getTimelineBuckets({
      objectType,
      objectId,
      days,
    });

    res.json({
      success: true,
      objectType,
      objectId,
      days,
      buckets,
    });
  });

  router.get('/revisions', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const objectName = String(req.query.objectName || '').trim();
    const objectId = String(req.query.id || req.query.objectId || '').trim();
    const objectType = resolveObjectType(objectName, req.query.objectType);
    if (!objectType || !objectId) {
      res.status(400).json({ success: false, message: 'objectName/objectType and id are required' });
      return;
    }
    try {
      const result = await listEntryRevisions({
        objectType,
        objectId,
        page: toPositiveInt(req.query.page, 1),
        limit: Math.min(toPositiveInt(req.query.limit, 20), 100),
      });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unable to load revisions',
      });
    }
  });
};
