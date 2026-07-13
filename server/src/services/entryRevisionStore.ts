'use strict';

import appModForDb from '../app';
import constants from '../models/constants';
import { sha256IntegrityHash } from '../utils/integrityHash';

export type RevisionSource = 'bootstrap' | 'create' | 'update' | 'merge' | 'change_request' | 'rollback';
export type EntrySnapshot = Record<string, unknown>;

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

export interface RevisionRecord extends Record<string, unknown> {
  _id?: unknown;
  objectType?: unknown;
  objectId?: unknown;
  revisionNumber?: unknown;
  snapshot?: EntrySnapshot;
  snapshotHash?: unknown;
  changedFields?: unknown;
}

export interface ChangeRequestRecord extends Record<string, unknown> {
  _id?: unknown;
  objectType?: unknown;
  objectId?: unknown;
  baseRevisionId?: unknown;
  baseRevisionNumber?: unknown;
  baseSnapshotHash?: unknown;
  proposedChanges?: EntrySnapshot;
  status?: unknown;
}

export interface EntryDocumentLike extends Record<string, unknown> {
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
  [constants.OBJECT_TYPES.civicRecord]: 'CivicRecord',
};

export const EDITABLE_FIELDS = new Set([
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
  'summary',
  'description',
  'severity',
  'jurisdictionId',
  'location',
  'responsibility',
  'project',
  'observation',
  'election',
  'outcome',
  'relatedRecordIds',
]);

export function modelFor(objectType: number): ModelContract {
  const modelName = MODEL_NAMES[objectType];
  const model = modelName ? db[modelName] : undefined;
  if (!model) {
    throw new Error('Unsupported entry type');
  }
  return model;
}

export function revisionModel(): ModelContract {
  const model = db.EntryRevision;
  if (!model) {
    throw new Error('Entry revision model is unavailable');
  }
  return model;
}

export function changeRequestModel(): ModelContract {
  const model = db.ChangeRequest;
  if (!model) {
    throw new Error('Change request model is unavailable');
  }
  return model;
}

export function toSnapshot(entry: EntryDocumentLike): EntrySnapshot {
  const raw = typeof entry.toObject === 'function'
    ? entry.toObject({ depopulate: true, versionKey: false, virtuals: false })
    : entry;
  const snapshot = JSON.parse(JSON.stringify(raw)) as EntrySnapshot;
  delete snapshot.__v;
  return snapshot;
}

export function changedFields(previous: EntrySnapshot | null, current: EntrySnapshot): string[] {
  if (!previous) {
    return Object.keys(current).filter((key) => key !== '_id').sort();
  }
  return Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]))
    .filter((key) => key !== '_id' && sha256IntegrityHash(previous[key]) !== sha256IntegrityHash(current[key]))
    .sort();
}

export async function latestRevision(objectType: number, objectId: string): Promise<RevisionRecord | null> {
  return revisionModel().findOne({ objectType, objectId }).sort({ revisionNumber: -1 }).lean();
}

export async function nextRevisionNumber(objectType: number, objectId: string): Promise<number> {
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
