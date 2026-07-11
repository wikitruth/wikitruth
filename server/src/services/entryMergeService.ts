'use strict';

import crypto from 'crypto';

import appModForDb from '../app';
import constants from '../models/constants';
import { logEntryEvent } from './entryEventsService';

type EntryRecord = Record<string, unknown> & {
  _id?: unknown;
  title?: unknown;
  content?: unknown;
  editDate?: unknown;
  ownerType?: unknown;
  ownerId?: unknown;
  parentId?: unknown;
  questionId?: unknown;
  categoryId?: unknown;
  groupId?: unknown;
  private?: unknown;
};

interface LeanQuery {
  lean(): Promise<EntryRecord | null>;
}

interface ListQuery {
  limit(limit: number): ListQuery;
  lean(): Promise<EntryRecord[]>;
}

interface UpdateResult {
  modifiedCount?: number;
  matchedCount?: number;
}

interface ModelContract {
  findById(id: string): LeanQuery;
  find(query: Record<string, unknown>): ListQuery;
  findOne(query: Record<string, unknown>): LeanQuery;
  create(payload: Record<string, unknown>): Promise<EntryRecord>;
  updateOne(query: Record<string, unknown>, update: Record<string, unknown>): Promise<UpdateResult>;
  updateMany(query: Record<string, unknown>, update: Record<string, unknown>): Promise<UpdateResult>;
}

type ModelRegistry = Record<string, ModelContract | undefined>;

export interface DuplicateCandidate {
  id: string;
  title: string;
  editDate: string | null;
  rule: 'exact_title' | 'exact_content' | 'near_title';
  score: number;
}

export interface MergeActor {
  id: string;
  username: string;
}

export interface MergeResult {
  source: { objectType: number; id: string };
  target: { objectType: number; id: string; path: string };
  movedRelationships: Record<string, number>;
  redirectId: string;
}

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

const COLLECTION_NAMES: Record<number, string> = {
  [constants.OBJECT_TYPES.topic]: 'topics',
  [constants.OBJECT_TYPES.argument]: 'arguments',
  [constants.OBJECT_TYPES.question]: 'questions',
  [constants.OBJECT_TYPES.answer]: 'answers',
  [constants.OBJECT_TYPES.issue]: 'issues',
  [constants.OBJECT_TYPES.opinion]: 'opinions',
  [constants.OBJECT_TYPES.artifact]: 'artifacts',
};

export function normalizeDuplicateText(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function contentHash(value: unknown): string {
  const normalized = normalizeDuplicateText(value);
  return normalized ? crypto.createHash('sha256').update(normalized).digest('hex') : '';
}

function jaccardScore(left: string, right: string): number {
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  if (leftTokens.size < 3 || rightTokens.size < 3) {
    return 0;
  }
  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

export function compareDuplicateEntries(source: EntryRecord, candidate: EntryRecord): DuplicateCandidate | null {
  const sourceTitle = normalizeDuplicateText(source.title);
  const candidateTitle = normalizeDuplicateText(candidate.title);
  const sourceContentHash = contentHash(source.content);
  const candidateContentHash = contentHash(candidate.content);
  let rule: DuplicateCandidate['rule'] | null = null;
  let score = 0;

  if (sourceTitle && sourceTitle === candidateTitle) {
    rule = 'exact_title';
    score = 1;
  } else if (sourceContentHash && sourceContentHash === candidateContentHash) {
    rule = 'exact_content';
    score = 1;
  } else {
    score = jaccardScore(sourceTitle, candidateTitle);
    if (score >= 0.86) {
      rule = 'near_title';
    }
  }

  if (!rule) {
    return null;
  }

  return {
    id: String(candidate._id || ''),
    title: String(candidate.title || ''),
    editDate: candidate.editDate ? new Date(candidate.editDate as string | number | Date).toISOString() : null,
    rule,
    score: Number(score.toFixed(4)),
  };
}

function addScopeValue(query: Record<string, unknown>, key: string, value: unknown): void {
  query[key] = value || null;
}

export function buildDuplicateScope(objectType: number, entry: EntryRecord): Record<string, unknown> {
  const query: Record<string, unknown> = {
    private: Boolean(entry.private),
  };
  addScopeValue(query, 'groupId', entry.groupId);

  switch (objectType) {
    case constants.OBJECT_TYPES.topic:
      addScopeValue(query, 'parentId', entry.parentId);
      if (!entry.parentId) {
        addScopeValue(query, 'categoryId', entry.categoryId);
        addScopeValue(query, 'ownerId', entry.ownerId);
        query.ownerType = Number(entry.ownerType ?? -1);
      }
      break;
    case constants.OBJECT_TYPES.answer:
      addScopeValue(query, 'questionId', entry.questionId);
      break;
    case constants.OBJECT_TYPES.opinion:
      query.ownerType = Number(entry.ownerType || 0);
      addScopeValue(query, 'ownerId', entry.ownerId);
      addScopeValue(query, 'parentId', entry.parentId);
      break;
    case constants.OBJECT_TYPES.artifact:
      addScopeValue(query, 'parentId', entry.parentId);
      if (!entry.parentId) {
        query.ownerType = Number(entry.ownerType || 0);
        addScopeValue(query, 'ownerId', entry.ownerId);
      }
      break;
    default:
      query.ownerType = Number(entry.ownerType || 0);
      addScopeValue(query, 'ownerId', entry.ownerId);
      break;
  }

  return query;
}

function modelFor(objectType: number): ModelContract {
  const modelName = MODEL_NAMES[objectType];
  const model = modelName ? db[modelName] : undefined;
  if (!model) {
    throw new Error('Unsupported entry type');
  }
  return model;
}

async function loadEntry(objectType: number, id: string): Promise<EntryRecord> {
  const entry = await modelFor(objectType).findById(id).lean();
  if (!entry) {
    throw new Error('Entry not found');
  }
  return entry;
}

export async function findDuplicateCandidates(objectType: number, id: string): Promise<DuplicateCandidate[]> {
  const source = await loadEntry(objectType, id);
  return findDuplicateCandidatesForDraft(objectType, source, id);
}

export async function findDuplicateCandidatesForDraft(
  objectType: number,
  draft: EntryRecord,
  excludeId?: string
): Promise<DuplicateCandidate[]> {
  const query = buildDuplicateScope(objectType, draft);
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const entries = await modelFor(objectType).find(query).limit(300).lean();
  return entries
    .map((entry) => compareDuplicateEntries(draft, entry))
    .filter((candidate): candidate is DuplicateCandidate => Boolean(candidate?.id))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function scopeSignature(objectType: number, entry: EntryRecord): string {
  const scope = buildDuplicateScope(objectType, entry);
  return JSON.stringify(Object.keys(scope).sort().map((key) => [key, String(scope[key] ?? '')]));
}

function dateMatches(expected: string | undefined, actual: unknown): boolean {
  if (!expected) {
    return true;
  }
  if (!actual) {
    return false;
  }
  return new Date(expected).getTime() === new Date(actual as string | number | Date).getTime();
}

async function updateRelationship(
  summary: Record<string, number>,
  modelName: string,
  label: string,
  query: Record<string, unknown>,
  update: Record<string, unknown>
): Promise<void> {
  const model = db[modelName];
  if (!model) {
    return;
  }
  const result = await model.updateMany(query, { $set: update });
  summary[label] = Number(result.modifiedCount || 0);
}

async function moveRelationships(
  objectType: number,
  sourceId: string,
  targetId: string
): Promise<Record<string, number>> {
  const summary: Record<string, number> = {};
  const modelNames = Object.values(MODEL_NAMES);

  for (const modelName of modelNames) {
    await updateRelationship(
      summary,
      modelName,
      `${modelName}.ownerId`,
      { ownerType: objectType, ownerId: sourceId },
      { ownerId: targetId }
    );
  }

  if (objectType === constants.OBJECT_TYPES.topic) {
    await updateRelationship(summary, 'Topic', 'Topic.parentId', { parentId: sourceId }, { parentId: targetId });
    await updateRelationship(summary, 'TopicLink', 'TopicLink.topicId', { topicId: sourceId }, { topicId: targetId });
    await updateRelationship(summary, 'TopicLink', 'TopicLink.parentId', { parentId: sourceId }, { parentId: targetId });
  }
  if (objectType === constants.OBJECT_TYPES.argument) {
    await updateRelationship(summary, 'Argument', 'Argument.parentId', { parentId: sourceId }, { parentId: targetId });
    await updateRelationship(summary, 'ArgumentLink', 'ArgumentLink.argumentId', { argumentId: sourceId }, { argumentId: targetId });
    await updateRelationship(summary, 'ArgumentLink', 'ArgumentLink.parentId', { parentId: sourceId }, { parentId: targetId });
    await updateRelationship(summary, 'ArgumentLink', 'ArgumentLink.threadId', { threadId: sourceId }, { threadId: targetId });
  }
  if (objectType === constants.OBJECT_TYPES.question) {
    await updateRelationship(summary, 'Answer', 'Answer.questionId', { questionId: sourceId }, { questionId: targetId });
  }
  if (objectType === constants.OBJECT_TYPES.opinion) {
    await updateRelationship(summary, 'Opinion', 'Opinion.parentId', { parentId: sourceId }, { parentId: targetId });
  }
  if (objectType === constants.OBJECT_TYPES.artifact) {
    await updateRelationship(summary, 'Artifact', 'Artifact.parentId', { parentId: sourceId }, { parentId: targetId });
  }

  await updateRelationship(summary, 'ObjectLink', 'ObjectLink.leftId', { leftType: objectType, leftId: sourceId }, { leftId: targetId });
  await updateRelationship(summary, 'ObjectLink', 'ObjectLink.rightId', { rightType: objectType, rightId: sourceId }, { rightId: targetId });
  return summary;
}

export function buildEntryPath(objectType: number, id: string, friendlyUrl?: unknown): string {
  const collection = COLLECTION_NAMES[objectType];
  if (!collection) {
    throw new Error('Unsupported entry type');
  }
  const encodedId = encodeURIComponent(id);
  if (objectType === constants.OBJECT_TYPES.answer) {
    return `/${collection}/entry/${encodedId}`;
  }
  return `/${collection}/entry/${encodeURIComponent(String(friendlyUrl || id))}/${encodedId}`;
}

export async function mergeEntries(options: {
  objectType: number;
  sourceId: string;
  targetId: string;
  sourceEditDate?: string;
  targetEditDate?: string;
  reason: string;
  actor: MergeActor;
}): Promise<MergeResult> {
  const { objectType, sourceId, targetId, sourceEditDate, targetEditDate, reason, actor } = options;
  if (sourceId === targetId) {
    throw new Error('Source and target must be different entries');
  }
  if (reason.trim().length < 10) {
    throw new Error('Merge reason must be at least 10 characters');
  }

  const [source, target, existingRedirect] = await Promise.all([
    loadEntry(objectType, sourceId),
    loadEntry(objectType, targetId),
    db.EntryRedirect?.findOne({ sourceObjectType: objectType, sourceObjectId: sourceId }).lean(),
  ]);
  if (existingRedirect) {
    throw new Error('Source entry already has a merge redirect');
  }
  if (scopeSignature(objectType, source) !== scopeSignature(objectType, target)) {
    throw new Error('Entries must share the same duplicate scope and visibility');
  }
  if (!compareDuplicateEntries(source, target)) {
    throw new Error('Target is not a deterministic duplicate candidate');
  }
  if (!dateMatches(sourceEditDate, source.editDate) || !dateMatches(targetEditDate, target.editDate)) {
    throw new Error('Entry changed after the merge preview was loaded');
  }

  const redirectModel = db.EntryRedirect;
  if (!redirectModel) {
    throw new Error('Entry redirect model is unavailable');
  }
  const redirect = await redirectModel.create({
    sourceObjectType: objectType,
    sourceObjectId: sourceId,
    targetObjectType: objectType,
    targetObjectId: targetId,
    status: 'pending',
    reason: reason.trim(),
    createUserId: actor.id,
  });

  try {
    const movedRelationships = await moveRelationships(objectType, sourceId, targetId);
    const now = new Date();
    await modelFor(objectType).updateOne(
      { _id: sourceId },
      {
        $set: {
          'screening.status': constants.SCREENING_STATUS.status3.code,
          'extras.merge': {
            targetObjectType: objectType,
            targetObjectId: targetId,
            reason: reason.trim(),
            mergedDate: now,
            mergedUserId: actor.id,
          },
          editDate: now,
          editUserId: actor.id,
        },
      }
    );
    await redirectModel.updateOne(
      { _id: redirect._id },
      {
        $set: {
          status: 'completed',
          completedDate: now,
          movedRelationships,
        },
      }
    );

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.entry.merged',
      objectType,
      objectName: String(constants.OBJECT_ID_NAME_MAP[objectType] || 'entry'),
      objectId: targetId,
      actorUserId: actor.id,
      actorUsername: actor.username,
      message: `Merged duplicate ${sourceId} into ${targetId}`,
      payload: {
        sourceId,
        targetId,
        reason: reason.trim(),
        movedRelationships,
        redirectId: String(redirect._id || ''),
      },
    });

    return {
      source: { objectType, id: sourceId },
      target: {
        objectType,
        id: targetId,
        path: buildEntryPath(objectType, targetId, target.friendlyUrl),
      },
      movedRelationships,
      redirectId: String(redirect._id || ''),
    };
  } catch (error) {
    await redirectModel.updateOne(
      { _id: redirect._id },
      {
        $set: {
          status: 'failed',
          failureMessage: error instanceof Error ? error.message : 'Unknown merge failure',
        },
      }
    );
    throw error;
  }
}

export async function findCompletedRedirect(objectType: number, sourceId: string): Promise<EntryRecord | null> {
  const redirectModel = db.EntryRedirect;
  if (!redirectModel) {
    return null;
  }
  return redirectModel.findOne({
    sourceObjectType: objectType,
    sourceObjectId: sourceId,
    status: 'completed',
  }).lean();
}
