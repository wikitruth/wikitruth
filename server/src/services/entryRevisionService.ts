'use strict';

import appModForDb from '../app';
import constants from '../models/constants';
import { sha256IntegrityHash } from '../utils/integrityHash';
import { logEntryEvent } from './entryEventsService';
import * as utils from '../utils/utils';

type RevisionSource = 'bootstrap' | 'create' | 'update' | 'merge' | 'change_request' | 'rollback';

type EntrySnapshot = Record<string, unknown>;

interface QueryOne<T> {
  sort(sort: Record<string, 1 | -1>): QueryOne<T>;
  lean(): Promise<T | null>;
}

interface QueryMany<T> {
  sort(sort: Record<string, 1 | -1>): QueryMany<T>;
  skip(count: number): QueryMany<T>;
  limit(count: number): QueryMany<T>;
  lean(): Promise<T[]>;
}

interface RevisionRecord extends Record<string, unknown> {
  _id?: unknown;
  objectType?: unknown;
  objectId?: unknown;
  revisionNumber?: unknown;
  snapshot?: EntrySnapshot;
  snapshotHash?: unknown;
  changedFields?: unknown;
}

interface ChangeRequestRecord extends Record<string, unknown> {
  _id?: unknown;
  objectType?: unknown;
  objectId?: unknown;
  baseRevisionId?: unknown;
  baseRevisionNumber?: unknown;
  baseSnapshotHash?: unknown;
  proposedChanges?: EntrySnapshot;
  status?: unknown;
}

interface EntryDocumentLike extends Record<string, unknown> {
  _id?: unknown;
  toObject?: (options?: Record<string, unknown>) => EntrySnapshot;
}

interface ModelContract {
  findById(id: string): QueryOne<EntrySnapshot>;
  findOne(query: Record<string, unknown>): QueryOne<RevisionRecord>;
  find(query: Record<string, unknown>): QueryMany<RevisionRecord>;
  countDocuments(query: Record<string, unknown>): Promise<number>;
  create(payload: Record<string, unknown>): Promise<RevisionRecord>;
  updateOne(query: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
  findOneAndUpdate(
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options: Record<string, unknown>
  ): { lean(): Promise<Record<string, unknown> | null> };
}

type ModelRegistry = Record<string, ModelContract | undefined>;

const db = (appModForDb as unknown as { db: { models: ModelRegistry } }).db.models;

const MODEL_NAMES: Record<number, string> = {
  [constants.OBJECT_TYPES.topic]: 'Topic',
  [constants.OBJECT_TYPES.argument]: 'Argument',
  [constants.OBJECT_TYPES.question]: 'Question',
  [constants.OBJECT_TYPES.answer]: 'Answer',
  [constants.OBJECT_TYPES.issue]: 'Issue',
  [constants.OBJECT_TYPES.opinion]: 'Opinion',
  [constants.OBJECT_TYPES.artifact]: 'Artifact',
};

const EDITABLE_FIELDS = new Set([
  'title',
  'contextTitle',
  'content',
  'contentPreview',
  'references',
  'referenceDate',
  'source',
  'typeId',
  'tags',
  'ethicalStatus',
  'artifactType',
  'provenance',
]);

function modelFor(objectType: number): ModelContract {
  const modelName = MODEL_NAMES[objectType];
  const model = modelName ? db[modelName] : undefined;
  if (!model) {
    throw new Error('Unsupported entry type');
  }
  return model;
}

function revisionModel(): ModelContract {
  const model = db.EntryRevision;
  if (!model) {
    throw new Error('Entry revision model is unavailable');
  }
  return model;
}

function toSnapshot(entry: EntryDocumentLike): EntrySnapshot {
  const raw = typeof entry.toObject === 'function'
    ? entry.toObject({ depopulate: true, versionKey: false, virtuals: false })
    : entry;
  const snapshot = JSON.parse(JSON.stringify(raw)) as EntrySnapshot;
  delete snapshot.__v;
  return snapshot;
}

function changedFields(previous: EntrySnapshot | null, current: EntrySnapshot): string[] {
  if (!previous) {
    return Object.keys(current).filter((key) => key !== '_id').sort();
  }
  return Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]))
    .filter((key) => key !== '_id' && sha256IntegrityHash(previous[key]) !== sha256IntegrityHash(current[key]))
    .sort();
}

async function latestRevision(objectType: number, objectId: string): Promise<RevisionRecord | null> {
  return revisionModel().findOne({ objectType, objectId }).sort({ revisionNumber: -1 }).lean();
}

async function nextRevisionNumber(objectType: number, objectId: string): Promise<number> {
  const counter = db.EntryRevisionCounter;
  if (!counter) {
    throw new Error('Entry revision counter model is unavailable');
  }
  const result = await counter.findOneAndUpdate(
    { key: `${objectType}:${objectId}` },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return Number(result?.sequence || 0);
}

export async function captureEntryRevision(options: {
  objectType: number;
  objectId: string;
  entry: EntryDocumentLike;
  source: RevisionSource;
  summary?: string;
  actorId?: string | null;
  actorUsername?: string | null;
}): Promise<RevisionRecord> {
  const snapshot = toSnapshot(options.entry);
  const snapshotHash = sha256IntegrityHash(snapshot);
  const latest = await latestRevision(options.objectType, options.objectId);
  if (latest && String(latest.snapshotHash || '') === snapshotHash) {
    return latest;
  }

  const duplicate = await revisionModel()
    .findOne({ objectType: options.objectType, objectId: options.objectId, snapshotHash })
    .sort({ revisionNumber: -1 })
    .lean();
  if (duplicate) {
    return duplicate;
  }

  const revisionNumber = await nextRevisionNumber(options.objectType, options.objectId);
  try {
    return await revisionModel().create({
      objectType: options.objectType,
      objectId: options.objectId,
      revisionNumber,
      parentRevisionId: latest?._id || null,
      source: options.source,
      summary: String(options.summary || '').trim(),
      snapshot,
      snapshotHash,
      changedFields: changedFields(latest?.snapshot || null, snapshot),
      createUserId: options.actorId || null,
      createUsername: options.actorUsername || '',
    });
  } catch (error) {
    const isDuplicate = Boolean(error && typeof error === 'object' && Number((error as { code?: unknown }).code) === 11000);
    if (!isDuplicate) {
      throw error;
    }
    const existing = await revisionModel()
      .findOne({ objectType: options.objectType, objectId: options.objectId, snapshotHash })
      .sort({ revisionNumber: -1 })
      .lean();
    if (!existing) {
      throw error;
    }
    return existing;
  }
}

export async function ensureCurrentRevision(options: {
  objectType: number;
  objectId: string;
}): Promise<RevisionRecord> {
  const latest = await latestRevision(options.objectType, options.objectId);
  if (latest) {
    return latest;
  }
  const entry = await modelFor(options.objectType).findById(options.objectId).lean();
  if (!entry) {
    throw new Error('Entry not found');
  }
  return captureEntryRevision({
    ...options,
    entry,
    source: 'bootstrap',
    summary: 'Initial revision captured from existing entry',
  });
}

export async function listEntryRevisions(options: {
  objectType: number;
  objectId: string;
  page?: number;
  limit?: number;
}): Promise<{ revisions: Record<string, unknown>[]; total: number; page: number; limit: number }> {
  await ensureCurrentRevision(options);
  const page = Math.max(Number(options.page || 1), 1);
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);
  const query = { objectType: options.objectType, objectId: options.objectId };
  const [total, records] = await Promise.all([
    revisionModel().countDocuments(query),
    revisionModel().find(query).sort({ revisionNumber: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  return {
    total,
    page,
    limit,
    revisions: records.map((record) => ({
      _id: record._id,
      revisionNumber: record.revisionNumber,
      parentRevisionId: record.parentRevisionId || null,
      source: record.source,
      summary: record.summary || '',
      snapshotHash: record.snapshotHash,
      changedFields: record.changedFields || [],
      createDate: record.createDate,
      createUserId: record.createUserId || null,
      createUsername: record.createUsername || '',
    })),
  };
}

function sanitizeProposedChanges(value: unknown): EntrySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const input = value as EntrySnapshot;
  return Object.keys(input).reduce<EntrySnapshot>((result, key) => {
    if (EDITABLE_FIELDS.has(key) && typeof input[key] !== 'undefined') {
      result[key] = input[key];
    }
    return result;
  }, {});
}

function changeRequestModel(): ModelContract {
  const model = db.ChangeRequest;
  if (!model) {
    throw new Error('Change request model is unavailable');
  }
  return model;
}

export async function createChangeRequest(options: {
  objectType: number;
  objectId: string;
  proposedChanges: unknown;
  summary: string;
  actorId: string;
  actorUsername: string;
}): Promise<RevisionRecord> {
  const proposedChanges = sanitizeProposedChanges(options.proposedChanges);
  if (!Object.keys(proposedChanges).length) {
    throw new Error('At least one supported proposed field is required');
  }
  if (options.summary.trim().length < 10) {
    throw new Error('Change request summary must be at least 10 characters');
  }
  const baseRevision = await ensureCurrentRevision(options);
  const request = await changeRequestModel().create({
    objectType: options.objectType,
    objectId: options.objectId,
    baseRevisionId: baseRevision._id,
    baseRevisionNumber: Number(baseRevision.revisionNumber || 0),
    baseSnapshotHash: String(baseRevision.snapshotHash || ''),
    proposedChanges,
    summary: options.summary.trim(),
    status: 'open',
    createUserId: options.actorId,
    createUsername: options.actorUsername,
  });
  await logEntryEvent({
    eventType: 'change_request.created',
    objectType: options.objectType,
    objectId: options.objectId,
    actorUserId: options.actorId,
    actorUsername: options.actorUsername,
    message: options.summary.trim(),
    payload: { changeRequestId: String(request._id || ''), fields: Object.keys(proposedChanges) },
  });
  return request;
}

export async function listChangeRequests(options: {
  objectType?: number;
  objectId?: string;
  status?: string;
}): Promise<ChangeRequestRecord[]> {
  const query: Record<string, unknown> = {};
  if (options.objectType) {
    query.objectType = options.objectType;
  }
  if (options.objectId) {
    query.objectId = options.objectId;
  }
  if (options.status) {
    query.status = options.status;
  }
  return changeRequestModel().find(query).sort({ createDate: -1 }).skip(0).limit(100).lean() as Promise<ChangeRequestRecord[]>;
}

function pickAcceptedChanges(proposed: EntrySnapshot, acceptedFields?: string[]): EntrySnapshot {
  const allowed = acceptedFields?.length ? new Set(acceptedFields) : new Set(Object.keys(proposed));
  return Object.keys(proposed).reduce<EntrySnapshot>((result, key) => {
    if (allowed.has(key)) {
      result[key] = proposed[key];
    }
    return result;
  }, {});
}

export async function resolveChangeRequest(options: {
  id: string;
  action: 'accept' | 'reject';
  acceptedFields?: string[];
  decisionNote: string;
  actorId: string;
  actorUsername: string;
}): Promise<ChangeRequestRecord> {
  const request = await changeRequestModel().findById(options.id).lean() as ChangeRequestRecord | null;
  if (!request) {
    throw new Error('Change request not found');
  }
  if (request.status !== 'open') {
    throw new Error('Change request is no longer open');
  }
  if (options.decisionNote.trim().length < 5) {
    throw new Error('Decision note must be at least 5 characters');
  }
  const objectType = Number(request.objectType || 0);
  const objectId = String(request.objectId || '');
  const latest = await ensureCurrentRevision({ objectType, objectId });
  if (String(latest._id || '') !== String(request.baseRevisionId || '')) {
    await changeRequestModel().updateOne(
      { _id: options.id },
      { $set: { status: 'stale', decisionNote: 'Entry changed after this request was submitted', decisionDate: new Date() } }
    );
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'change_request.stale',
      objectType,
      objectId,
      actorUserId: options.actorId,
      actorUsername: options.actorUsername,
      message: 'Change request rejected because its base revision is stale',
      payload: { changeRequestId: options.id, baseRevisionId: request.baseRevisionId, latestRevisionId: latest._id },
    });
    throw new Error('Change request is stale because the entry has a newer revision');
  }

  const now = new Date();
  if (options.action === 'reject') {
    await changeRequestModel().updateOne(
      { _id: options.id },
      { $set: {
        status: 'rejected',
        decisionNote: options.decisionNote.trim(),
        decisionDate: now,
        decisionUserId: options.actorId,
        decisionUsername: options.actorUsername,
      } }
    );
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'change_request.resolved',
      objectType,
      objectId,
      actorUserId: options.actorId,
      actorUsername: options.actorUsername,
      message: options.decisionNote.trim(),
      payload: { changeRequestId: options.id, status: 'rejected', acceptedFields: [] },
    });
    return { ...request, status: 'rejected', decisionNote: options.decisionNote.trim() };
  }

  const proposed = sanitizeProposedChanges(request.proposedChanges || {});
  const accepted = pickAcceptedChanges(proposed, options.acceptedFields);
  if (!Object.keys(accepted).length) {
    throw new Error('At least one proposed field must be accepted');
  }
  const acceptedFields = Object.keys(accepted);
  if (typeof accepted.title === 'string') {
    accepted.friendlyUrl = utils.urlify(accepted.title);
  }
  if (typeof accepted.content === 'string' && typeof accepted.contentPreview === 'undefined') {
    accepted.contentPreview = accepted.content.slice(0, 240);
  }
  await modelFor(objectType).updateOne(
    { _id: objectId },
    { $set: { ...accepted, editDate: now, editUserId: options.actorId } }
  );
  const updated = await modelFor(objectType).findById(objectId).lean();
  if (!updated) {
    throw new Error('Updated entry could not be reloaded');
  }
  const appliedRevision = await captureEntryRevision({
    objectType,
    objectId,
    entry: updated,
    source: 'change_request',
    summary: options.decisionNote.trim(),
    actorId: options.actorId,
    actorUsername: options.actorUsername,
  });
  const status = acceptedFields.length === Object.keys(proposed).length ? 'accepted' : 'partially_accepted';
  await changeRequestModel().updateOne(
    { _id: options.id },
    { $set: {
      status,
      acceptedFields,
      decisionNote: options.decisionNote.trim(),
      decisionDate: now,
      decisionUserId: options.actorId,
      decisionUsername: options.actorUsername,
      appliedRevisionId: appliedRevision._id,
    } }
  );
  await logEntryEvent({
    scope: 'privileged',
    eventType: 'change_request.resolved',
    objectType,
    objectId,
    actorUserId: options.actorId,
    actorUsername: options.actorUsername,
    message: options.decisionNote.trim(),
    payload: { changeRequestId: options.id, status, acceptedFields, appliedRevisionId: appliedRevision._id },
  });
  return { ...request, status, acceptedFields, appliedRevisionId: appliedRevision._id };
}

export async function rollbackEntry(options: {
  objectType: number;
  objectId: string;
  revisionId: string;
  reason: string;
  actorId: string;
  actorUsername: string;
}): Promise<RevisionRecord> {
  if (options.reason.trim().length < 10) {
    throw new Error('Rollback reason must be at least 10 characters');
  }
  const targetRevision = await revisionModel().findById(options.revisionId).lean() as RevisionRecord | null;
  if (!targetRevision
    || Number(targetRevision.objectType || 0) !== options.objectType
    || String(targetRevision.objectId || '') !== options.objectId
    || !targetRevision.snapshot) {
    throw new Error('Rollback revision does not match the target entry');
  }
  const restore = { ...targetRevision.snapshot };
  delete restore._id;
  delete restore.__v;
  delete restore.createDate;
  delete restore.createUserId;
  restore.editDate = new Date();
  restore.editUserId = options.actorId;
  const currentEntry = await modelFor(options.objectType).findById(options.objectId).lean();
  if (!currentEntry) {
    throw new Error('Entry not found');
  }
  const protectedFields = new Set(['_id', '__v', 'createDate', 'createUserId']);
  const unset = Object.keys(currentEntry).reduce<Record<string, 1>>((result, field) => {
    if (!protectedFields.has(field) && typeof restore[field] === 'undefined') {
      result[field] = 1;
    }
    return result;
  }, {});
  await modelFor(options.objectType).updateOne(
    { _id: options.objectId },
    { $set: restore, ...(Object.keys(unset).length ? { $unset: unset } : {}) }
  );
  const updated = await modelFor(options.objectType).findById(options.objectId).lean();
  if (!updated) {
    throw new Error('Rolled-back entry could not be reloaded');
  }
  const revision = await captureEntryRevision({
    objectType: options.objectType,
    objectId: options.objectId,
    entry: updated,
    source: 'rollback',
    summary: options.reason.trim(),
    actorId: options.actorId,
    actorUsername: options.actorUsername,
  });
  await logEntryEvent({
    scope: 'privileged',
    eventType: 'entry.revision.rolled-back',
    objectType: options.objectType,
    objectId: options.objectId,
    actorUserId: options.actorId,
    actorUsername: options.actorUsername,
    message: options.reason.trim(),
    payload: { restoredRevisionId: options.revisionId, createdRevisionId: revision._id },
  });
  return revision;
}
