'use strict';
import constants from '../models/constants';
import mongoose from 'mongoose';
import { sha256IntegrityHash } from '../utils/integrityHash';

import appModForDb from '../app';
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
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

type ChainedEvent = {
  _id?: unknown;
  scope?: unknown;
  eventType?: unknown;
  objectType?: unknown;
  objectName?: unknown;
  objectId?: unknown;
  actorUserId?: unknown;
  actorUsername?: unknown;
  message?: unknown;
  payload?: unknown;
  createDate?: unknown;
  chainSequence?: unknown;
  previousHash?: unknown;
  eventHash?: unknown;
  hashVersion?: unknown;
};

export interface AuditChainVerification {
  valid: boolean;
  verifiedEvents: number;
  legacyEvents: number;
  headSequence: number;
  headHash: string;
  brokenAtSequence: number | null;
  reason: string | null;
}

function hashPayload(event: ChainedEvent): Record<string, unknown> {
  return {
    hashVersion: Number(event.hashVersion || 1),
    chainSequence: Number(event.chainSequence || 0),
    previousHash: String(event.previousHash || ''),
    scope: String(event.scope || ''),
    eventType: String(event.eventType || ''),
    objectType: Number(event.objectType || 0),
    objectName: String(event.objectName || ''),
    objectId: String(event.objectId || ''),
    actorUserId: event.actorUserId ? String(event.actorUserId) : null,
    actorUsername: String(event.actorUsername || ''),
    message: String(event.message || ''),
    payload: event.payload || {},
    createDate: new Date(event.createDate as string | number | Date).toISOString(),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && Number((error as { code?: unknown }).code) === 11000);
}

async function createPrivilegedEvent(input: EntryEventInput): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const latest = await db.EntryEvent
      .findOne({ scope: 'privileged', chainSequence: { $ne: null } })
      .sort({ chainSequence: -1 })
      .lean() as ChainedEvent | null;
    const createDate = new Date();
    const event: ChainedEvent = {
      scope: 'privileged',
      eventType: input.eventType,
      objectType: input.objectType,
      objectName: resolveObjectName(input.objectType, input.objectName),
      objectId: input.objectId,
      actorUserId: input.actorUserId || null,
      actorUsername: input.actorUsername || '',
      message: input.message || '',
      payload: input.payload || {},
      createDate,
      chainSequence: Number(latest?.chainSequence || 0) + 1,
      previousHash: String(latest?.eventHash || ''),
      hashVersion: 1,
    };
    event.eventHash = sha256IntegrityHash(hashPayload(event));
    try {
      await db.EntryEvent.create(event);
      return;
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt === 4) {
        throw error;
      }
    }
  }
}

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

  const scope = input.scope || 'entry';
  if (scope === 'privileged') {
    await createPrivilegedEvent(input);
    return;
  }

  await db.EntryEvent.create({
    scope,
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

async function verifyPrivilegedEventChain(): Promise<AuditChainVerification> {
  const [legacyEvents, events] = await Promise.all([
    db.EntryEvent.countDocuments({
      scope: 'privileged',
      $or: [{ chainSequence: null }, { eventHash: '' }, { eventHash: { $exists: false } }],
    }),
    db.EntryEvent
      .find({ scope: 'privileged', chainSequence: { $ne: null } })
      .sort({ chainSequence: 1 })
      .lean() as Promise<ChainedEvent[]>,
  ]);

  let previousHash = '';
  let expectedSequence = 1;
  for (const event of events) {
    const sequence = Number(event.chainSequence || 0);
    if (sequence !== expectedSequence) {
      return {
        valid: false,
        verifiedEvents: expectedSequence - 1,
        legacyEvents: Number(legacyEvents || 0),
        headSequence: sequence,
        headHash: String(event.eventHash || ''),
        brokenAtSequence: sequence,
        reason: `Expected sequence ${expectedSequence}, found ${sequence}`,
      };
    }
    if (String(event.previousHash || '') !== previousHash) {
      return {
        valid: false,
        verifiedEvents: expectedSequence - 1,
        legacyEvents: Number(legacyEvents || 0),
        headSequence: sequence,
        headHash: String(event.eventHash || ''),
        brokenAtSequence: sequence,
        reason: 'Previous hash does not match the verified chain head',
      };
    }
    const calculatedHash = sha256IntegrityHash(hashPayload(event));
    if (calculatedHash !== String(event.eventHash || '')) {
      return {
        valid: false,
        verifiedEvents: expectedSequence - 1,
        legacyEvents: Number(legacyEvents || 0),
        headSequence: sequence,
        headHash: String(event.eventHash || ''),
        brokenAtSequence: sequence,
        reason: 'Event hash does not match stored event content',
      };
    }
    previousHash = calculatedHash;
    expectedSequence += 1;
  }

  return {
    valid: true,
    verifiedEvents: events.length,
    legacyEvents: Number(legacyEvents || 0),
    headSequence: Number(events.at(-1)?.chainSequence || 0),
    headHash: previousHash,
    brokenAtSequence: null,
    reason: null,
  };
}

async function listTimelineEvents(options: {
  objectType: number;
  objectId: string;
  page?: number;
  limit?: number;
  eventTypes?: string[];
}): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
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
}): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
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

export {
  logEntryEvent,
  listTimelineEvents,
  listPrivilegedEvents,
  getTimelineBuckets,
  verifyPrivilegedEventChain,
};
