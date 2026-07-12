'use strict';

import type { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import appModForDb from '../../app';
import { logEntryEvent } from '../../services/entryEventsService';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  CIVIC_RECORD_KINDS,
  CIVIC_RECORD_STAGES,
  CIVIC_RECORD_STATUSES,
  CIVIC_SEVERITIES,
  type CivicRecordKind,
  type CivicHistoryItem,
  type CivicRecordStage,
  type CivicRecordStatus,
  type CivicSeverity,
} from '../../types/civic';
import * as utils from '../../utils/utils';

interface CivicRecordShape {
  _id: mongoose.Types.ObjectId;
  kind: CivicRecordKind;
  title: string;
  friendlyUrl: string;
  status: CivicRecordStatus;
  stage: CivicRecordStage;
  severity: CivicSeverity;
  parentId?: mongoose.Types.ObjectId | null;
  relatedRecordIds?: mongoose.Types.ObjectId[];
  history: CivicHistoryItem[];
  outcome?: { summary?: string; happenedAt?: Date | string | null };
  private: boolean;
  createUserId?: mongoose.Types.ObjectId | string;
  editUserId?: mongoose.Types.ObjectId | string;
  editDate?: Date;
  [key: string]: unknown;
}

const db = (appModForDb as unknown as {
  db: { models: { CivicRecord: mongoose.Model<CivicRecordShape> } };
}).db.models;

const optionalDate = z.union([z.string().trim().min(1), z.date(), z.null()]).optional();
const optionalId = z.string().trim().refine(
  (value) => !value || mongoose.isValidObjectId(value),
  'Must be a valid record id',
).optional();
const optionalIdArray = z.array(z.string().trim().refine((value) => mongoose.isValidObjectId(value), 'Invalid id')).max(50).optional();

const civicRecordInput = z.object({
  kind: z.enum(CIVIC_RECORD_KINDS),
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(500).optional().default(''),
  description: z.string().trim().max(30000).optional().default(''),
  severity: z.enum(CIVIC_SEVERITIES).optional().default('info'),
  parentId: optionalId,
  relatedRecordIds: optionalIdArray,
  artifactIds: optionalIdArray,
  issueIds: optionalIdArray,
  location: z.object({
    countryCode: z.string().trim().length(2).optional(),
    region: z.string().trim().max(120).optional(),
    province: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    barangay: z.string().trim().max(120).optional(),
    address: z.string().trim().max(300).optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
    }).optional(),
  }).optional(),
  responsibility: z.object({
    institutionId: optionalId,
    officeId: optionalId,
    personId: optionalId,
    role: z.string().trim().max(180).optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  }).optional(),
  project: z.object({
    budget: z.number().min(0).nullable().optional(),
    currency: z.string().trim().length(3).optional(),
    contractor: z.string().trim().max(240).optional(),
    contractReference: z.string().trim().max(240).optional(),
    progressPercent: z.number().min(0).max(100).nullable().optional(),
    startDate: optionalDate,
    targetEndDate: optionalDate,
    actualEndDate: optionalDate,
  }).optional(),
  observation: z.object({
    observedAt: optionalDate,
    sourceUrl: z.string().trim().url().or(z.literal('')).optional(),
    escalationStatus: z.enum(['submitted', 'screening', 'accepted', 'escalated', 'addressed', 'rejected']).optional(),
  }).optional(),
  election: z.object({
    position: z.string().trim().max(180).optional(),
    electionDate: optionalDate,
    jurisdiction: z.string().trim().max(180).optional(),
    platform: z.string().trim().max(5000).optional(),
  }).optional(),
  outcome: z.object({
    summary: z.string().trim().max(5000).optional(),
    happenedAt: optionalDate,
  }).optional(),
  private: z.boolean().optional().default(false),
});

const civicRecordUpdate = civicRecordInput.partial().omit({ kind: true });
const civicTransitionInput = z.object({
  status: z.enum(CIVIC_RECORD_STATUSES).optional(),
  stage: z.enum(CIVIC_RECORD_STAGES).optional(),
  reason: z.string().trim().min(10).max(2000),
  outcome: z.object({
    summary: z.string().trim().max(5000).optional(),
    happenedAt: optionalDate,
  }).optional(),
}).refine((value) => Boolean(value.status || value.stage || value.outcome), {
  message: 'A status, stage, or outcome change is required',
});

const PARENT_KINDS: Partial<Record<CivicRecordKind, CivicRecordKind[]>> = {
  office: ['institution'],
  person: ['institution', 'office'],
  project: ['institution', 'office'],
  observation: ['project', 'incident'],
  action: ['institution', 'office', 'project', 'incident'],
  candidate: ['election'],
  history: ['institution', 'office', 'person', 'project', 'incident', 'action', 'election', 'candidate'],
};

function actorId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

function canPlayRole(req: WikitruthRequest, role: string): boolean {
  return Boolean(req.user?.canPlayRoleOf?.(role));
}

function canViewPrivate(req: WikitruthRequest, record: Record<string, unknown>): boolean {
  return !record.private || canPlayRole(req, 'admin') || String(record.createUserId || '') === actorId(req);
}

function canEdit(req: WikitruthRequest, record: Record<string, unknown>): boolean {
  return Boolean(req.user) && (canPlayRole(req, 'admin') || String(record.createUserId || '') === actorId(req));
}

function ensureContributor(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (req.user && (canPlayRole(req, 'contributor') || canPlayRole(req, 'admin'))) {
    return true;
  }
  res.status(req.user ? 403 : 401).json({ message: req.user ? 'Contributor privileges required' : 'Authentication required' });
  return false;
}

function ensureReviewer(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (req.user && (canPlayRole(req, 'reviewer') || canPlayRole(req, 'admin'))) {
    return true;
  }
  res.status(req.user ? 403 : 401).json({ message: req.user ? 'Reviewer or admin privileges required' : 'Authentication required' });
  return false;
}

function validationError(res: WikitruthResponse, error: z.ZodError): void {
  res.status(400).json({
    message: 'Invalid civic record data',
    details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

async function validateParent(kind: CivicRecordKind, parentId?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!parentId) {
    return { ok: true };
  }
  const parent = await db.CivicRecord.findById(parentId).select('kind').lean();
  if (!parent) {
    return { ok: false, message: 'Parent civic record was not found' };
  }
  const allowed = PARENT_KINDS[kind];
  if (allowed && !allowed.includes(parent.kind)) {
    return { ok: false, message: `${kind} records cannot be placed under ${parent.kind} records` };
  }
  return { ok: true };
}

function publicQuery(req: WikitruthRequest): Record<string, unknown> {
  if (canPlayRole(req, 'admin')) {
    return {};
  }
  if (req.user) {
    return { $or: [{ private: false }, { createUserId: req.user._id }] };
  }
  return { private: false };
}

async function getOverview(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  const visibility = publicQuery(req);
  const counts = Object.fromEntries(await Promise.all(CIVIC_RECORD_KINDS.map(async (kind) => [
    kind,
    await db.CivicRecord.countDocuments({ ...visibility, kind }),
  ])));
  const recent = await db.CivicRecord.find(visibility)
    .sort({ editDate: -1 })
    .limit(12)
    .select('kind title friendlyUrl summary status stage severity location editDate')
    .lean();
  const urgent = await db.CivicRecord.find({
    ...visibility,
    kind: 'incident',
    severity: { $in: ['high', 'critical'] },
    status: { $nin: ['resolved', 'archived'] },
  }).sort({ editDate: -1 }).limit(8).lean();

  res.json({ counts, recent, urgent, kinds: CIVIC_RECORD_KINDS, statuses: CIVIC_RECORD_STATUSES, stages: CIVIC_RECORD_STAGES });
}

async function listRecords(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  const query: Record<string, unknown> = publicQuery(req);
  const kinds = String(req.query.kind || '').split(',').map((value) => value.trim()).filter(
    (value): value is CivicRecordKind => CIVIC_RECORD_KINDS.includes(value as CivicRecordKind),
  );
  if (kinds.length === 1) query.kind = kinds[0];
  if (kinds.length > 1) query.kind = { $in: kinds };
  if (CIVIC_RECORD_STATUSES.includes(req.query.status as never)) query.status = req.query.status;
  if (CIVIC_RECORD_STAGES.includes(req.query.stage as never)) query.stage = req.query.stage;
  if (CIVIC_SEVERITIES.includes(req.query.severity as never)) query.severity = req.query.severity;
  if (mongoose.isValidObjectId(String(req.query.parentId || ''))) query.parentId = req.query.parentId;
  if (req.query.region) query['location.region'] = String(req.query.region).trim();
  if (req.query.city) query['location.city'] = String(req.query.city).trim();
  const search = String(req.query.q || '').trim();
  if (search) query.$text = { $search: search };

  const requestedLimit = Number(req.query.limit || 50);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const records = await db.CivicRecord.find(query)
    .sort(search ? { score: { $meta: 'textScore' }, editDate: -1 } : { editDate: -1 })
    .limit(limit)
    .lean();
  res.json({ records, count: records.length });
}

async function getRecord(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid civic record id' });
    return;
  }
  const record = await db.CivicRecord.findById(req.params.id).lean();
  if (!record || !canViewPrivate(req, record)) {
    res.status(404).json({ message: 'Civic record not found' });
    return;
  }
  const visibility = publicQuery(req);
  const [parent, children, related] = await Promise.all([
    record.parentId ? db.CivicRecord.findOne({ ...visibility, _id: record.parentId }).lean() : null,
    db.CivicRecord.find({ ...visibility, parentId: record._id }).sort({ kind: 1, title: 1 }).limit(100).lean(),
    record.relatedRecordIds?.length
      ? db.CivicRecord.find({ ...visibility, _id: { $in: record.relatedRecordIds } }).sort({ title: 1 }).lean()
      : [],
  ]);
  res.json({ record, parent, children, related });
}

async function createRecord(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (!ensureContributor(req, res)) return;
  const parsed = civicRecordInput.safeParse(req.body || {});
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }
  const parentValidation = await validateParent(parsed.data.kind, parsed.data.parentId);
  if (!parentValidation.ok) {
    res.status(400).json({ message: parentValidation.message });
    return;
  }
  const now = new Date();
  const record = await db.CivicRecord.create({
    ...parsed.data,
    parentId: parsed.data.parentId || null,
    friendlyUrl: utils.urlify(parsed.data.title),
    status: 'pending',
    stage: 'reported',
    createUserId: req.user?._id,
    editUserId: req.user?._id,
    createDate: now,
    editDate: now,
    history: [{
      action: 'created',
      summary: `${parsed.data.kind} record submitted`,
      date: now,
      actorUserId: req.user?._id,
      actorUsername: req.user?.username || '',
      toStatus: 'pending',
      toStage: 'reported',
    }],
  });
  await logEntryEvent({
    eventType: 'civic.record.created',
    objectType: 0,
    objectName: 'civicRecord',
    objectId: String(record._id),
    actorUserId: actorId(req),
    actorUsername: String(req.user?.username || ''),
    message: `${parsed.data.kind} civic record submitted`,
    payload: { kind: parsed.data.kind, title: parsed.data.title, parentId: parsed.data.parentId || null },
  });
  res.status(201).json({ record });
}

async function updateRecord(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (!ensureContributor(req, res)) return;
  const record = await db.CivicRecord.findById(req.params.id);
  if (!record || !canViewPrivate(req, record.toObject())) {
    res.status(404).json({ message: 'Civic record not found' });
    return;
  }
  if (!canEdit(req, record)) {
    res.status(403).json({ message: 'Only the contributor or an administrator may edit this record' });
    return;
  }
  const parsed = civicRecordUpdate.safeParse(req.body || {});
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }
  const parentId = parsed.data.parentId ?? (record.parentId ? String(record.parentId) : undefined);
  const parentValidation = await validateParent(record.kind, parentId);
  if (!parentValidation.ok) {
    res.status(400).json({ message: parentValidation.message });
    return;
  }
  Object.assign(record, parsed.data, {
    parentId: parentId || null,
    friendlyUrl: parsed.data.title ? utils.urlify(parsed.data.title) : record.friendlyUrl,
    editUserId: req.user?._id,
    editDate: new Date(),
  });
  record.history.push({
    action: 'updated',
    summary: 'Civic record details updated',
    date: new Date(),
    actorUserId: req.user?._id,
    actorUsername: req.user?.username || '',
  });
  await record.save();
  res.json({ record });
}

async function transitionRecord(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (!ensureReviewer(req, res)) return;
  const parsed = civicTransitionInput.safeParse(req.body || {});
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }
  const record = await db.CivicRecord.findById(req.params.id);
  if (!record) {
    res.status(404).json({ message: 'Civic record not found' });
    return;
  }
  const previousStatus = record.status;
  const previousStage = record.stage;
  if (parsed.data.status) record.status = parsed.data.status;
  if (parsed.data.stage) record.stage = parsed.data.stage;
  if (parsed.data.outcome) record.outcome = parsed.data.outcome;
  record.editUserId = req.user?._id;
  record.editDate = new Date();
  record.history.push({
    action: 'transitioned',
    summary: 'Civic lifecycle decision recorded',
    reason: parsed.data.reason,
    date: new Date(),
    actorUserId: req.user?._id,
    actorUsername: req.user?.username || '',
    fromStatus: previousStatus,
    toStatus: record.status,
    fromStage: previousStage,
    toStage: record.stage,
  });
  await record.save();
  await logEntryEvent({
    scope: 'privileged',
    eventType: 'civic.record.transitioned',
    objectType: 0,
    objectName: 'civicRecord',
    objectId: String(record._id),
    actorUserId: actorId(req),
    actorUsername: String(req.user?.username || ''),
    message: 'Civic lifecycle decision recorded',
    payload: {
      kind: record.kind,
      fromStatus: previousStatus,
      toStatus: record.status,
      fromStage: previousStage,
      toStage: record.stage,
      reason: parsed.data.reason,
    },
  });
  res.json({ record });
}

async function compareCandidates(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  const ids = String(req.query.ids || '').split(',').map((id) => id.trim()).filter((id) => mongoose.isValidObjectId(id));
  if (ids.length < 2 || ids.length > 6) {
    res.status(400).json({ message: 'Select between two and six valid candidate records' });
    return;
  }
  const candidates = await db.CivicRecord.find({ ...publicQuery(req), _id: { $in: ids }, kind: 'candidate' })
    .sort({ title: 1 })
    .lean();
  if (candidates.length !== ids.length) {
    res.status(404).json({ message: 'One or more candidate records were not found' });
    return;
  }
  res.json({ candidates });
}

export = function attachCivic(router: Router) {
  router.get('/overview', getOverview);
  router.get('/records', listRecords);
  router.get('/records/:id', getRecord);
  router.post('/records', createRecord);
  router.put('/records/:id', updateRecord);
  router.post('/records/:id/transition', transitionRecord);
  router.get('/candidates/compare', compareCandidates);
};
