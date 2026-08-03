'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import appModForDb from '../../app';
import constantsMod from '../../models/constants';
import * as flowUtilsNs from '../../utils/flowUtils';
import { isOnboardingComplete } from './authHelpers';
import { logEntryEvent } from '../../services/entryEventsService';
import { notifySubscribers } from '../../services/notificationsService';
import { recordEntryRevision } from './revisionWriteRecorder';
import { withViewModeFilter } from './viewFilter';

const constants = constantsMod as unknown as {
  OBJECT_TYPES: Record<string, number>;
  LINK_TYPES: { child: number; reference: number };
  SCREENING_STATUS: {
    status0: { code: number };
    status1: { code: number };
    status2: { code: number };
    status3: { code: number };
  };
};
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
const flowUtils = flowUtilsNs as unknown as {
  updateChildrenCount: (entryId: unknown, entryType: unknown, specificEntryType?: unknown) => Promise<void>;
};

const GRAPH_RELATIONSHIPS = ['child', 'support', 'oppose', 'related', 'evidence', 'source', 'dependency', 'supports', 'refutes', 'qualifies', 'background'] as const;
type GraphRelationship = (typeof GRAPH_RELATIONSHIPS)[number];
type EntryKind = 'topic' | 'argument' | 'artifact' | 'question' | 'answer' | 'issue' | 'opinion';
type OutlineEntry = { _id: unknown; private?: unknown; createUserId?: unknown; screening?: { status?: unknown }; [key: string]: unknown };
type ResolvedEntry = { kind: EntryKind; entry: OutlineEntry };
type OutlineTreeNode = {
  _id: string;
  objectName: 'topic';
  title: string;
  friendlyUrl?: string;
  archived: boolean;
  children: OutlineTreeNode[];
};
type TreeBudget = { remaining: number; truncated: boolean };
type HierarchyContextStatus = 'root' | 'complete' | 'unavailable';
type AncestorLoadResult = { ancestors: OutlineTreeNode[]; complete: boolean };

const MAX_TREE_NODES = 500;
const MAX_ANCESTOR_DEPTH = 20;
const TARGET_MODEL_NAMES: Record<EntryKind, string> = {
  topic: 'Topic', argument: 'Argument', artifact: 'Artifact', question: 'Question', answer: 'Answer', issue: 'Issue', opinion: 'Opinion',
};

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeLimit(raw: unknown, fallback = 20, max = 100): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), max) : fallback;
}

function topicNode(topic: Record<string, unknown>): OutlineTreeNode {
  const screening = topic.screening as { status?: unknown } | undefined;
  return {
    _id: String(topic._id || ''), objectName: 'topic', title: String(topic.title || ''),
    friendlyUrl: String(topic.friendlyUrl || ''),
    archived: Number(screening?.status) === constants.SCREENING_STATUS.status3.code,
    children: [],
  };
}

async function buildTopicForest(
  req: WikitruthRequest,
  roots: Record<string, unknown>[],
  depth: number,
  budget: TreeBudget,
  childLimit = 30,
): Promise<OutlineTreeNode[]> {
  const selectedRoots = roots.slice(0, Math.max(0, budget.remaining));
  if (selectedRoots.length < roots.length) budget.truncated = true;
  budget.remaining -= selectedRoots.length;
  const trees = selectedRoots.map(topicNode);
  let parents = trees;
  for (let level = 0; level < depth && parents.length && budget.remaining > 0; level += 1) {
    const parentById = new Map(parents.map((node) => [node._id, node]));
    const children = await db.Topic.find(withViewModeFilter(req, {
      parentId: { $in: Array.from(parentById.keys()) },
      private: false,
    })).sort({ editDate: -1 }).limit(Math.min(MAX_TREE_NODES, budget.remaining + parents.length * childLimit)).lean();
    const next: OutlineTreeNode[] = [];
    const perParent = new Map<string, number>();
    for (const child of children) {
      if (budget.remaining <= 0) { budget.truncated = true; break; }
      const parentId = String(child.parentId || '');
      const parent = parentById.get(parentId);
      const count = perParent.get(parentId) || 0;
      if (!parent || count >= childLimit) { if (count >= childLimit) budget.truncated = true; continue; }
      const node = topicNode(child);
      parent.children.push(node);
      next.push(node);
      perParent.set(parentId, count + 1);
      budget.remaining -= 1;
    }
    parents = next;
  }
  if (budget.remaining <= 0) budget.truncated = true;
  return trees;
}

function isPublicTopic(req: WikitruthRequest, topic: Record<string, unknown> | null | undefined): topic is Record<string, unknown> {
  if (!topic || topic.private === true) return false;
  const screening = topic.screening as { status?: unknown } | undefined;
  if (typeof screening?.status === 'undefined') return true;
  const filter = withViewModeFilter(req, {} as Record<string, unknown>)['screening.status'];
  if (typeof filter === 'undefined') return true;
  if (filter && typeof filter === 'object' && '$in' in filter) {
    return (filter.$in as unknown[]).map(Number).includes(Number(screening.status));
  }
  return Number(screening.status) === Number(filter);
}

function isPublicHierarchyContextTopic(
  topic: Record<string, unknown> | null | undefined,
): topic is Record<string, unknown> {
  if (!topic || topic.private === true) return false;
  const screening = topic.screening as { status?: unknown } | undefined;
  if (typeof screening?.status === 'undefined') return true;
  const status = Number(screening.status);
  return status === constants.SCREENING_STATUS.status1.code
    || status === constants.SCREENING_STATUS.status3.code;
}

async function loadTopicAncestors(root: Record<string, unknown>, ancestorDepth: number): Promise<AncestorLoadResult> {
  const ancestors: OutlineTreeNode[] = [];
  let parentId = String(root.parentId || '').trim();
  const seen = new Set([String(root._id || '')]);

  while (parentId && ancestors.length < ancestorDepth) {
    if (seen.has(parentId)) return { ancestors, complete: false };
    seen.add(parentId);
    const parent = await db.Topic.findById(parentId).lean();
    if (!isPublicHierarchyContextTopic(parent)) return { ancestors, complete: false };
    ancestors.unshift(topicNode(parent));
    parentId = String(parent.parentId || '').trim();
  }

  return { ancestors, complete: !parentId };
}

async function resolveEntry(id: string, kinds: EntryKind[]): Promise<ResolvedEntry | null> {
  for (const kind of kinds) {
    const entry = await db[TARGET_MODEL_NAMES[kind]].findById(id);
    if (entry) return { kind, entry };
  }
  return null;
}

function isAdmin(req: WikitruthRequest): boolean {
  return Boolean(req.user?.canPlayRoleOf?.('admin'));
}

function actorId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

function canAccess(req: WikitruthRequest, resolved: ResolvedEntry): boolean {
  const actor = actorId(req);
  if (isAdmin(req) || String(resolved.entry.createUserId || '') === actor) return true;
  if (resolved.entry.private === true) return false;
  const screeningStatus = resolved.entry.screening?.status;
  return typeof screeningStatus === 'undefined' || Number(screeningStatus) === constants.SCREENING_STATUS.status1.code;
}

function parseRelationship(value: unknown): GraphRelationship | null {
  const relationship = String(value || 'child').trim().toLowerCase();
  return GRAPH_RELATIONSHIPS.includes(relationship as GraphRelationship) ? relationship as GraphRelationship : null;
}

function relationshipIsCompatible(relationship: GraphRelationship, target: ResolvedEntry): boolean {
  if (relationship === 'child' || relationship === 'related' || relationship === 'dependency') return true;
  if (relationship === 'support' || relationship === 'oppose') return target.kind === 'argument';
  return target.kind === 'artifact';
}

function parseCitation(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const locatorType = String(input.locatorType || 'other').trim().toLowerCase();
  if (!['page', 'section', 'timestamp', 'paragraph', 'dataset_row', 'quote', 'other'].includes(locatorType)) return null;
  const locator = String(input.locator || '').trim().slice(0, 500);
  const quote = String(input.quote || '').trim().slice(0, 500);
  const note = String(input.note || '').trim().slice(0, 1000);
  if (!locator && !quote && !note) return null;
  return { locatorType, locator, quote, note };
}

async function finalizeLink(
  req: WikitruthRequest,
  parent: ResolvedEntry,
  target: ResolvedEntry,
  relationship: GraphRelationship,
  link: Record<string, unknown>,
  objectName: 'topicLink' | 'argumentLink' | 'objectLink',
): Promise<void> {
  const objectType = Number(constants.OBJECT_TYPES[objectName]);
  await recordEntryRevision({ req, objectType, entry: link, source: 'create', summary: `${relationship} graph relationship created` });
  await logEntryEvent({
    scope: 'privileged', eventType: 'graph.relationship.created',
    objectType: Number(constants.OBJECT_TYPES[parent.kind]), objectName: parent.kind, objectId: String(parent.entry._id),
    actorUserId: actorId(req), actorUsername: String(req.user?.username || ''),
    message: `${relationship} relationship created to ${target.kind}`,
    payload: {
      relationship, linkId: String(link._id || ''), linkObjectName: objectName,
      targetType: target.kind, targetId: String(target.entry._id || ''), apiClientId: req.apiClient?.id || null,
    },
  });
  await notifySubscribers({
    target: { objectType: Number(constants.OBJECT_TYPES[parent.kind]), objectName: parent.kind, objectId: String(parent.entry._id) },
    type: 'graph', trigger: 'reply', title: 'Knowledge graph relationship added',
    body: `${relationship} relationship added to this entry.`, excludeUserIds: [actorId(req)],
    payload: { relationship, targetType: target.kind, targetId: String(target.entry._id || '') },
  });
}

export = function (router: Router) {
  router.get('/tree', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const rootId = String(req.query.rootId || '').trim();
    const depth = sanitizeLimit(req.query.depth, 2, 4);
    const requestedAncestorDepth = Number(req.query.ancestorDepth);
    const ancestorDepth = Number.isFinite(requestedAncestorDepth) && requestedAncestorDepth >= 0
      ? Math.min(Math.floor(requestedAncestorDepth), MAX_ANCESTOR_DEPTH)
      : 0;
    const childLimit = sanitizeLimit(req.query.childLimit, 30, 30);
    const rootLimit = sanitizeLimit(req.query.rootLimit, 20, 20);
    const budget: TreeBudget = { remaining: MAX_TREE_NODES, truncated: false };
    if (rootId) {
      const root = await db.Topic.findById(rootId).lean();
      if (!isPublicTopic(req, root)) { res.status(404).json({ success: false, message: 'Root topic not found' }); return; }
      const [tree] = await buildTopicForest(req, [root], depth, budget, childLimit);
      const ancestorResult = await loadTopicAncestors(root, ancestorDepth);
      const hierarchyContext: HierarchyContextStatus = !String(root.parentId || '').trim()
        ? 'root'
        : ancestorResult.complete ? 'complete' : 'unavailable';
      res.json({
        success: true,
        tree,
        ancestors: ancestorResult.ancestors,
        hierarchyContext,
        truncated: budget.truncated,
      });
      return;
    }
    const roots = await db.Topic.find(withViewModeFilter(req, {
      parentId: null, private: false,
    })).sort({ editDate: -1 }).limit(rootLimit).lean();
    res.json({
      success: true,
      trees: await buildTopicForest(req, roots, depth, budget, childLimit),
      ancestors: [],
      hierarchyContext: 'root',
      truncated: budget.truncated,
    });
  });

  router.get('/search', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const term = String(req.query.q || '').trim();
    const limit = sanitizeLimit(req.query.limit, 20, 100);
    const requested = String(req.query.types || 'topic,argument').split(',').map((value) => value.trim());
    if (term.length < 2) { res.json({ success: true, results: [] }); return; }
    const regex = new RegExp(escapeRegex(term), 'i');
    const kinds = (Object.keys(TARGET_MODEL_NAMES) as EntryKind[]).filter((kind) => requested.includes(kind));
    const rows = await Promise.all(kinds.map(async (kind) => {
      const entries = await db[TARGET_MODEL_NAMES[kind]].find(withViewModeFilter(req, {
        title: regex, private: false,
      })).sort({ editDate: -1 }).limit(limit).lean();
      return entries.map((entry: Record<string, unknown>) => ({
        _id: String(entry._id || ''), title: String(entry.title || ''), friendlyUrl: entry.friendlyUrl || '', objectName: kind,
      }));
    }));
    res.json({ success: true, results: rows.flat().slice(0, limit) });
  });

  router.post('/link', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; }
    if (!isOnboardingComplete(req.user as never, 'contributor')) {
      res.status(403).json({ success: false, code: 'ONBOARDING_REQUIRED', message: 'Complete contributor onboarding before editing the graph.' });
      return;
    }
    const parentId = String(req.body?.parentId || '').trim();
    const targetId = String(req.body?.targetId || '').trim();
    const relationship = parseRelationship(req.body?.relationship);
    const citation = parseCitation(req.body?.citation);
    if (!parentId || !targetId || !relationship) {
      res.status(400).json({ success: false, message: 'parentId, targetId, and a valid relationship are required' });
      return;
    }
    if (parentId === targetId) { res.status(400).json({ success: false, message: 'Cannot link an entry to itself' }); return; }
    const parent = await resolveEntry(parentId, ['topic', 'argument', 'answer']);
    const target = await resolveEntry(targetId, Object.keys(TARGET_MODEL_NAMES) as EntryKind[]);
    if (!parent || !target) { res.status(404).json({ success: false, message: !parent ? 'Parent entry not found' : 'Target entry not found' }); return; }
    if (!canAccess(req, parent) || !canAccess(req, target)) {
      res.status(403).json({ success: false, message: 'The parent or target is not accessible in this context' });
      return;
    }
    if (!relationshipIsCompatible(relationship, target)) {
      res.status(400).json({ success: false, message: `${relationship} is not compatible with a ${target.kind} target` });
      return;
    }

    const now = new Date();
    const common = { relationship, editUserId: actorId(req), editDate: now, createUserId: actorId(req), createDate: now };
    let link: Record<string, unknown>;
    let objectName: 'topicLink' | 'argumentLink' | 'objectLink';
    if (target.kind === 'topic' && ['child', 'related', 'dependency'].includes(relationship)) {
      if (relationship === 'child' && parent.kind !== 'topic') {
        res.status(400).json({ success: false, message: 'A child topic requires a topic parent' }); return;
      }
      const query = { topicId: target.entry._id, parentId: parent.entry._id, relationship };
      const existing = await db.TopicLink.findOne(query).lean();
      if (existing) { res.json({ success: true, created: false, conflict: 'already_linked', link: existing }); return; }
      link = await db.TopicLink.findOneAndUpdate(query, {
        ...common, topicId: target.entry._id, parentId: parent.entry._id,
        ownerId: parent.entry.ownerId || parent.entry._id, ownerType: parent.entry.ownerType || constants.OBJECT_TYPES.topic,
        linkType: relationship === 'child' ? constants.LINK_TYPES.child : constants.LINK_TYPES.reference,
        private: Boolean(parent.entry.private || target.entry.private),
      }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
      objectName = 'topicLink';
      if (relationship === 'child') await flowUtils.updateChildrenCount(parent.entry._id, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic);
    } else if (target.kind === 'argument' && ['child', 'support', 'oppose', 'related', 'dependency'].includes(relationship)) {
      const topicParent = parent.kind === 'topic';
      const query = topicParent
        ? { argumentId: target.entry._id, parentId: null, ownerId: parent.entry._id, relationship }
        : { argumentId: target.entry._id, parentId: parent.entry._id, relationship };
      const existing = await db.ArgumentLink.findOne(query).lean();
      if (existing) { res.json({ success: true, created: false, conflict: 'already_linked', link: existing }); return; }
      link = await db.ArgumentLink.findOneAndUpdate(query, {
        ...common, argumentId: target.entry._id, parentId: topicParent ? null : parent.entry._id,
        ownerId: topicParent ? parent.entry._id : parent.entry.ownerId,
        ownerType: topicParent ? constants.OBJECT_TYPES.topic : parent.entry.ownerType,
        threadId: topicParent ? null : parent.entry.threadId || parent.entry._id,
        against: relationship === 'oppose',
        linkType: relationship === 'child' ? constants.LINK_TYPES.child : constants.LINK_TYPES.reference,
        private: Boolean(parent.entry.private || target.entry.private),
      }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
      objectName = 'argumentLink';
      await flowUtils.updateChildrenCount(parent.entry._id, constants.OBJECT_TYPES[parent.kind], constants.OBJECT_TYPES.argument);
    } else {
      const query = {
        leftType: constants.OBJECT_TYPES[parent.kind], leftId: parent.entry._id,
        rightType: constants.OBJECT_TYPES[target.kind], rightId: target.entry._id, relationship,
      };
      const existing = await db.ObjectLink.findOne(query).lean();
      if (existing) { res.json({ success: true, created: false, conflict: 'already_linked', link: existing }); return; }
      link = await db.ObjectLink.findOneAndUpdate(query, {
        ...common, ...query, private: Boolean(parent.entry.private || target.entry.private),
        extras: citation ? { citation } : {},
      }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
      objectName = 'objectLink';
    }
    await finalizeLink(req, parent, target, relationship, link, objectName);
    res.status(201).json({
      success: true, created: true,
      link: { _id: String(link._id || ''), objectName, parentId, targetId, relationship, citation },
    });
  });
};
