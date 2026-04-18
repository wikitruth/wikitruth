'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const constants = require('../../models/constants');
const {
  setSubscription,
  getSubscription,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} = require('../../services/notificationsService');

function ensureAuthenticated(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (!req.user?._id && !req.user?.id) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return false;
  }
  return true;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function resolveObjectType(objectName: string | undefined, objectType: unknown): number {
  const direct = Number(objectType);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const normalized = String(objectName || '').trim();
  return Number(constants.OBJECT_TYPES?.[normalized] || 0);
}

module.exports = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const unreadOnly = String(req.query.unreadOnly || '').trim() === '1';
    const userId = String(req.user?._id || req.user?.id || '');

    const result = await listNotifications({
      userId,
      page,
      limit,
      unreadOnly,
    });

    res.json({
      success: true,
      notifications: result.items,
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
      limit: result.limit,
    });
  });

  router.get('/summary', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const unreadCount = await getUnreadCount({
      userId: String(req.user?._id || req.user?.id || ''),
    });
    res.json({
      success: true,
      unreadCount,
    });
  });

  router.post('/:id/read', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const updated = await markNotificationRead({
      userId: String(req.user?._id || req.user?.id || ''),
      notificationId: String(req.params.id || '').trim(),
    });

    res.json({
      success: true,
      updated,
    });
  });

  router.post('/read-all', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const updated = await markAllNotificationsRead({
      userId: String(req.user?._id || req.user?.id || ''),
    });

    res.json({
      success: true,
      updated,
    });
  });

  router.put('/subscriptions', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const objectName = String(req.body?.objectName || '').trim();
    const objectId = String(req.body?.id || req.body?.objectId || '').trim();
    const objectType = resolveObjectType(objectName, req.body?.objectType);
    if (!objectName || !objectId || !objectType) {
      res.status(400).json({ success: false, message: 'objectName and id are required' });
      return;
    }

    const enabled = Boolean(req.body?.enabled);
    const triggers = Array.isArray(req.body?.triggers) ? req.body.triggers : undefined;

    const subscription = await setSubscription({
      userId: String(req.user?._id || req.user?.id || ''),
      target: {
        objectType,
        objectName,
        objectId,
      },
      enabled,
      triggers,
    });

    res.json({
      success: true,
      subscription,
    });
  });

  router.get('/subscriptions/:objectName/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const objectName = String(req.params.objectName || '').trim();
    const objectId = String(req.params.id || '').trim();
    const objectType = resolveObjectType(objectName, req.query.objectType);
    if (!objectName || !objectId || !objectType) {
      res.status(400).json({ success: false, message: 'objectName and id are required' });
      return;
    }

    const subscription = await getSubscription({
      userId: String(req.user?._id || req.user?.id || ''),
      target: {
        objectType,
        objectName,
        objectId,
      },
    });

    res.json({
      success: true,
      subscription,
    });
  });
};
