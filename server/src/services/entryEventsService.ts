'use strict';

const constants = require('../models/constants');
const db = require('../app').db.models;
const mongoose = require('mongoose');

type EntryEventScope = 'entry' | 'privileged';

type EntryEventInput = {
  scope?: EntryEventScope;
  eventType: string;
  objectType: number;
  objectName?: string;
  objectId: string;
  actorUserId?: string | null;
  actorUsername?: string | null;
  message?: string;
  payload?: Record<string, unknown>;
};

function resolveObjectName(objectType: number, objectName?: string): string {
  if (objectName) {
    return String(objectName).trim();
  }
  return String(constants.OBJECT_ID_NAME_MAP?.[objectType] || 'entry');
}

async function logEntryEvent(input: EntryEventInput): Promise<void> {
  if (!input?.eventType || !input?.objectType || !input?.objectId) {
    return;
  }

  await db.EntryEvent.create({
    scope: input.scope || 'entry',
    eventType: input.eventType,
    objectType: input.objectType,
    objectName: resolveObjectName(input.objectType, input.objectName),
    objectId: input.objectId,
    actorUserId: input.actorUserId || null,
    actorUsername: input.actorUsername || '',
    message: input.message || '',
    payload: input.payload || {},
    createDate: new Date(),
  });
}

async function listTimelineEvents(options: {
  objectType: number;
  objectId: string;
  page?: number;
  limit?: number;
  eventTypes?: string[];
}): Promise<{ items: any[]; total: number; page: number; limit: number }> {
  const page = Math.max(Number(options.page || 1), 1);
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);
  const query: Record<string, unknown> = {
    objectType: options.objectType,
    objectId: options.objectId,
  };
  if (Array.isArray(options.eventTypes) && options.eventTypes.length > 0) {
    query.eventType = { $in: options.eventTypes };
  }

  const [total, items] = await Promise.all([
    db.EntryEvent.countDocuments(query),
    db.EntryEvent
      .find(query)
      .sort({ createDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return { items, total, page, limit };
}

async function listPrivilegedEvents(options: {
  page?: number;
  limit?: number;
  eventTypes?: string[];
  objectType?: number | null;
}): Promise<{ items: any[]; total: number; page: number; limit: number }> {
  const page = Math.max(Number(options.page || 1), 1);
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);
  const query: Record<string, unknown> = {
    scope: 'privileged',
  };
  if (Array.isArray(options.eventTypes) && options.eventTypes.length > 0) {
    query.eventType = { $in: options.eventTypes };
  }
  if (typeof options.objectType === 'number' && options.objectType > 0) {
    query.objectType = options.objectType;
  }

  const [total, items] = await Promise.all([
    db.EntryEvent.countDocuments(query),
    db.EntryEvent
      .find(query)
      .sort({ createDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return { items, total, page, limit };
}

async function getTimelineBuckets(options: {
  objectType: number;
  objectId: string;
  days?: number;
}): Promise<Array<{ day: string; count: number }>> {
  const days = Math.min(Math.max(Number(options.days || 30), 1), 365);
  const from = new Date();
  from.setDate(from.getDate() - days);

  let objectId: string | any = options.objectId;
  if (mongoose?.Types?.ObjectId?.isValid(options.objectId)) {
    objectId = new mongoose.Types.ObjectId(options.objectId);
  }

  const rows = await db.EntryEvent.aggregate([
    {
      $match: {
        objectType: options.objectType,
        objectId: objectId,
        createDate: { $gte: from },
      },
    },
    {
      $project: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$createDate' } },
      },
    },
    {
      $group: {
        _id: '$day',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return rows.map((row: { _id: string; count: number }) => ({
    day: row._id,
    count: Number(row.count || 0),
  }));
}

module.exports = {
  logEntryEvent,
  listTimelineEvents,
  listPrivilegedEvents,
  getTimelineBuckets,
};
