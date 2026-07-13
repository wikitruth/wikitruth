'use strict';

import appModForDb from '../app';
import constants from '../models/constants';
import type {
  CivicEntryRelationship,
  CivicLinkedObjectName,
} from '../types/civicTenancy';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

const RELATIONSHIP_OBJECTS: Record<CivicEntryRelationship, CivicLinkedObjectName> = {
  subject: 'topic',
  claim: 'argument',
  question: 'question',
  answer: 'answer',
  evidence: 'artifact',
  discussion: 'opinion',
  review_issue: 'issue',
};

const MODEL_NAMES: Record<CivicLinkedObjectName, string> = {
  topic: 'Topic',
  argument: 'Argument',
  question: 'Question',
  answer: 'Answer',
  artifact: 'Artifact',
  opinion: 'Opinion',
  issue: 'Issue',
};

const ROUTE_NAMES: Record<CivicLinkedObjectName, string> = {
  topic: 'topics',
  argument: 'arguments',
  question: 'questions',
  answer: 'answers',
  artifact: 'artifacts',
  opinion: 'opinions',
  issue: 'issues',
};

export type CivicLinkedEntryPreview = {
  linkId?: string;
  relationship: CivicEntryRelationship;
  objectType: number;
  objectName: CivicLinkedObjectName;
  objectId: string;
  title: string;
  friendlyUrl: string;
  contentPreview: string;
  url: string;
  legacy: boolean;
};

export function linkedObjectName(relationship: CivicEntryRelationship): CivicLinkedObjectName {
  return RELATIONSHIP_OBJECTS[relationship];
}

export function linkedObjectType(objectName: CivicLinkedObjectName): number {
  return Number(constants.OBJECT_TYPES[objectName] || 0);
}

function canViewEntry(entry: Record<string, any>, userId?: string, isAdmin = false): boolean {
  if (!entry.private) return true;
  if (isAdmin) return true;
  return Boolean(userId && [entry.createUserId, entry.editUserId, entry.ownerId].some((value) => String(value || '') === userId));
}

function preview(
  entry: Record<string, any>,
  relationship: CivicEntryRelationship,
  objectName: CivicLinkedObjectName,
  linkId?: string,
  legacy = false,
): CivicLinkedEntryPreview {
  const objectId = String(entry._id || '');
  const friendlyUrl = String(entry.friendlyUrl || 'entry');
  return {
    linkId,
    relationship,
    objectType: linkedObjectType(objectName),
    objectName,
    objectId,
    title: String(entry.title || entry.contextTitle || '(Untitled entry)'),
    friendlyUrl,
    contentPreview: String(entry.contentPreview || entry.summary || '').slice(0, 300),
    url: `/${ROUTE_NAMES[objectName]}/entry/${encodeURIComponent(friendlyUrl)}/${encodeURIComponent(objectId)}`,
    legacy,
  };
}

export async function validateLinkedEntry(options: {
  relationship: CivicEntryRelationship;
  objectId: string;
  userId?: string;
  isAdmin?: boolean;
}): Promise<{ objectName: CivicLinkedObjectName; objectType: number; entry: Record<string, any> }> {
  const objectName = linkedObjectName(options.relationship);
  const model = db[MODEL_NAMES[objectName]];
  const entry = model ? await model.findById(options.objectId).lean() : null;
  if (!entry) throw new Error('Linked Wikitruth entry was not found');
  if (!canViewEntry(entry, options.userId, options.isAdmin)) throw new Error('Linked Wikitruth entry is private');
  return { objectName, objectType: linkedObjectType(objectName), entry };
}

export async function listCivicEntryLinks(options: {
  tenantId: string;
  record: Record<string, any>;
  userId?: string;
  isAdmin?: boolean;
}): Promise<CivicLinkedEntryPreview[]> {
  const links = await db.CivicEntryLink.find({ tenantId: options.tenantId, civicRecordId: options.record._id })
    .sort({ relationship: 1, createDate: 1 })
    .lean();
  const previews = await Promise.all(links.map(async (link: Record<string, any>) => {
    const objectName = String(link.objectName) as CivicLinkedObjectName;
    const model = db[MODEL_NAMES[objectName]];
    const entry = model ? await model.findById(link.objectId).lean() : null;
    if (!entry || !canViewEntry(entry, options.userId, options.isAdmin)) return null;
    return preview(entry, link.relationship, objectName, String(link._id));
  }));

  const persistedKeys = new Set(links.map((link: Record<string, any>) => `${link.objectName}:${String(link.objectId)}`));
  const legacyTargets = [
    ...((options.record.artifactIds || []) as unknown[]).map((objectId) => ({ objectId, objectName: 'artifact' as const, relationship: 'evidence' as const })),
    ...((options.record.issueIds || []) as unknown[]).map((objectId) => ({ objectId, objectName: 'issue' as const, relationship: 'review_issue' as const })),
  ].filter((target) => !persistedKeys.has(`${target.objectName}:${String(target.objectId)}`));
  const legacyPreviews = await Promise.all(legacyTargets.map(async (target) => {
    const entry = await db[MODEL_NAMES[target.objectName]].findById(target.objectId).lean();
    if (!entry || !canViewEntry(entry, options.userId, options.isAdmin)) return null;
    return preview(entry, target.relationship, target.objectName, undefined, true);
  }));

  return [...previews, ...legacyPreviews].filter((item): item is CivicLinkedEntryPreview => Boolean(item));
}
