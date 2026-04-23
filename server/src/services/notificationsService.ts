'use strict';

const constants = require('../models/constants');
const db = require('../app').db.models;

type EntryTarget = {
  objectType: number;
  objectName?: string;
  objectId: string;
};

function resolveObjectTypeByName(objectName: string | undefined): number {
  const normalized = String(objectName || '').trim().toLowerCase();
  if (!normalized) {
    return 0;
  }
  return Number(constants.OBJECT_TYPES?.[normalized] || 0);
}

function resolveObjectName(target: EntryTarget): string {
  if (target.objectName) {
    return String(target.objectName).trim();
  }
  return String(constants.OBJECT_ID_NAME_MAP?.[target.objectType] || 'entry');
}

function normalizeTarget(target: Partial<EntryTarget>): EntryTarget | null {
  const objectType = Number(target.objectType || resolveObjectTypeByName(target.objectName));
  const objectId = String(target.objectId || '').trim();
  if (!objectType || !objectId) {
    return null;
  }
  return {
    objectType,
    objectName: resolveObjectName({ objectType, objectName: target.objectName, objectId }),
    objectId,
  };
}

async function setSubscription(options: {
  userId: string;
  target: Partial<EntryTarget>;
  enabled: boolean;
  triggers?: string[];
}): Promise<{ followed: boolean; triggers: string[] }> {
  const target = normalizeTarget(options.target);
  if (!target) {
    throw new Error('Invalid subscription target');
  }

  const nextTriggers = Array.isArray(options.triggers) && options.triggers.length
    ? options.triggers.map((item) => String(item || '').trim()).filter(Boolean)
    : ['reply', 'screening', 'verdict', 'issue'];

  if (!options.enabled) {
    await db.Subscription.deleteOne({
      userId: options.userId,
      objectType: target.objectType,
      objectId: target.objectId,
    });
    return { followed: false, triggers: [] };
  }

  await db.Subscription.findOneAndUpdate(
    {
      userId: options.userId,
      objectType: target.objectType,
      objectId: target.objectId,
    },
    {
      $set: {
        userId: options.userId,
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.objectId,
        triggers: nextTriggers,
        active: true,
        editDate: new Date(),
      },
      $setOnInsert: {
        createDate: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    followed: true,
    triggers: nextTriggers,
  };
}

async function getSubscription(options: {
  userId: string;
  target: Partial<EntryTarget>;
}): Promise<{ followed: boolean; triggers: string[] }> {
  const target = normalizeTarget(options.target);
  if (!target) {
    return { followed: false, triggers: [] };
  }

  const subscription = await db.Subscription.findOne({
    userId: options.userId,
    objectType: target.objectType,
    objectId: target.objectId,
    active: true,
  }).lean();

  if (!subscription) {
    return { followed: false, triggers: [] };
  }

  return {
    followed: true,
    triggers: Array.isArray(subscription.triggers) ? subscription.triggers : [],
  };
}

async function createNotification(options: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  target?: Partial<EntryTarget>;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const target = normalizeTarget(options.target || {});
  await db.Notification.create({
    userId: options.userId,
    type: options.type,
    title: options.title,
    body: options.body || '',
    link: options.link || '',
    objectType: target?.objectType || null,
    objectName: target?.objectName || '',
    objectId: target?.objectId || null,
    payload: options.payload || {},
    readAt: null,
    createDate: new Date(),
  });
}

async function notifySubscribers(options: {
  target: Partial<EntryTarget>;
  type: string;
  title: string;
  body?: string;
  link?: string;
  payload?: Record<string, unknown>;
  excludeUserIds?: string[];
  trigger?: string;
}): Promise<number> {
  const target = normalizeTarget(options.target);
  if (!target) {
    return 0;
  }

  const excludeSet = new Set((options.excludeUserIds || []).map((value) => String(value)));
  const trigger = String(options.trigger || '').trim();

  const subscriptions = await db.Subscription.find({
    objectType: target.objectType,
    objectId: target.objectId,
    active: true,
  }).lean();

  const candidates = subscriptions.filter((subscription: { userId?: unknown; triggers?: unknown }) => {
    if (excludeSet.has(String(subscription.userId || ''))) {
      return false;
    }
    if (!trigger) {
      return true;
    }
    if (!Array.isArray(subscription.triggers) || subscription.triggers.length === 0) {
      return true;
    }
    return subscription.triggers.includes(trigger);
  });

  if (!candidates.length) {
    return 0;
  }

  await db.Notification.insertMany(
    candidates.map((subscription: { userId?: unknown }) => ({
      userId: subscription.userId,
      type: options.type,
      title: options.title,
      body: options.body || '',
      link: options.link || '',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.objectId,
      payload: options.payload || {},
      readAt: null,
      createDate: new Date(),
    }))
  );

  return candidates.length;
}

async function listNotifications(options: {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ items: unknown[]; total: number; unreadCount: number; page: number; limit: number }> {
  const page = Math.max(Number(options.page || 1), 1);
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);
  const query: Record<string, unknown> = {
    userId: options.userId,
  };
  if (options.unreadOnly) {
    query.readAt = null;
  }

  const [total, unreadCount, items] = await Promise.all([
    db.Notification.countDocuments(query),
    db.Notification.countDocuments({ userId: options.userId, readAt: null }),
    db.Notification
      .find(query)
      .sort({ createDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return {
    items,
    total,
    unreadCount,
    page,
    limit,
  };
}

async function markNotificationRead(options: { userId: string; notificationId: string }): Promise<boolean> {
  const result = await db.Notification.updateOne(
    { _id: options.notificationId, userId: options.userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return Boolean(result?.modifiedCount);
}

async function markAllNotificationsRead(options: { userId: string }): Promise<number> {
  const result = await db.Notification.updateMany(
    { userId: options.userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return Number(result?.modifiedCount || 0);
}

async function getUnreadCount(options: { userId: string }): Promise<number> {
  return db.Notification.countDocuments({
    userId: options.userId,
    readAt: null,
  });
}

module.exports = {
  setSubscription,
  getSubscription,
  createNotification,
  notifySubscribers,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
};
