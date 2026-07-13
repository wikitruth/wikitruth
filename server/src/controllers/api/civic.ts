'use strict';

import type { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import appModForDb from '../../app';
import { logEntryEvent } from '../../services/entryEventsService';
import { ensureCivicTenantRole } from '../../services/civicAuthorizationService';
import { publicCivicTenant } from '../../services/civicTenantService';
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
import constants from '../../models/constants';
import { recordEntryRevision } from './revisionWriteRecorder';
import { notifySubscribers } from '../../services/notificationsService';
import { listCivicEntryLinks } from '../../services/civicEntryLinkService';
import { civicTenantRoles } from '../../services/civicAuthorizationService';
import { registerCivicEntryLinkRoutes } from './civicEntryLinks';
import { registerCivicAdministrationRoutes } from './civicAdministration';

interface CivicRecordShape {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  countryCode: string;
  jurisdictionId?: mongoose.Types.ObjectId | null;
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
  db: { models: Record<string, any> & { CivicRecord: mongoose.Model<CivicRecordShape> } };
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
  jurisdictionId: optionalId,
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

function validationError(res: WikitruthResponse, error: z.ZodError): void {
  res.status(400).json({
    message: 'Invalid civic record data',
    details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

function tenantId(req: WikitruthRequest): string {
  const resolved = String(req.civicTenant?.tenantId || '').trim().toLowerCase();
  if (!resolved) throw new Error('Civic tenant context is unavailable');
  return resolved;
}

async function validateJurisdiction(req: WikitruthRequest, jurisdictionId?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!jurisdictionId) return { ok: true };
  const jurisdiction = await db.Jurisdiction.findOne({ _id: jurisdictionId, tenantId: tenantId(req), active: true }).lean();
  return jurisdiction ? { ok: true } : { ok: false, message: 'Jurisdiction was not found in this tenant' };
}

async function validateParent(req: WikitruthRequest, kind: CivicRecordKind, parentId?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!parentId) {
    return { ok: true };
  }
  const parent = await db.CivicRecord.findOne({ _id: parentId, tenantId: tenantId(req) }).select('kind').lean();
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
  const scope = { tenantId: tenantId(req) };
  if (canPlayRole(req, 'admin')) {
    return scope;
  }
  if (req.user) {
    return { ...scope, $or: [{ private: false }, { createUserId: req.user._id }] };
  }
  return { ...scope, private: false };
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

async function getTenantMetadata(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  res.json({ tenant: publicCivicTenant(req.civicTenant!) });
}

async function listJurisdictions(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  const query: Record<string, unknown> = { tenantId: tenantId(req), active: true };
  if (mongoose.isValidObjectId(String(req.query.parentId || ''))) query.parentId = req.query.parentId;
  if (req.query.levelKey) query.levelKey = String(req.query.levelKey).trim();
  const jurisdictions = await db.Jurisdiction.find(query).sort({ levelKey: 1, name: 1 }).limit(500).lean();
  res.json({ jurisdictions, count: jurisdictions.length });
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
  if (mongoose.isValidObjectId(String(req.query.jurisdictionId || ''))) query.jurisdictionId = req.query.jurisdictionId;
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
  const record = await db.CivicRecord.findOne({ _id: req.params.id, tenantId: tenantId(req) }).lean();
  if (!record || !canViewPrivate(req, record)) {
    res.status(404).json({ message: 'Civic record not found' });
    return;
  }
  const visibility = publicQuery(req);
  const roles = await civicTenantRoles(req, tenantId(req));
  const [parent, children, related, links] = await Promise.all([
    record.parentId ? db.CivicRecord.findOne({ ...visibility, _id: record.parentId }).lean() : null,
    db.CivicRecord.find({ ...visibility, parentId: record._id }).sort({ kind: 1, title: 1 }).limit(100).lean(),
    record.relatedRecordIds?.length
      ? db.CivicRecord.find({ ...visibility, _id: { $in: record.relatedRecordIds } }).sort({ title: 1 }).lean()
      : [],
    listCivicEntryLinks({ tenantId: tenantId(req), record, userId: actorId(req), isAdmin: roles.has('admin') }),
  ]);
  res.json({ record, parent, children, related, links });
}

async function createRecord(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (!await ensureCivicTenantRole(req, res, ['contributor', 'admin'])) return;
  const parsed = civicRecordInput.safeParse(req.body || {});
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }
  const parentValidation = await validateParent(req, parsed.data.kind, parsed.data.parentId);
  if (!parentValidation.ok) {
    res.status(400).json({ message: parentValidation.message });
    return;
  }
  const jurisdictionValidation = await validateJurisdiction(req, parsed.data.jurisdictionId);
  if (!jurisdictionValidation.ok) {
    res.status(400).json({ message: jurisdictionValidation.message });
    return;
  }
  const now = new Date();
  const tenant = req.civicTenant!;
  const project = parsed.data.project
    ? { ...parsed.data.project, currency: parsed.data.project.currency || tenant.localization.currency }
    : undefined;
  const location = parsed.data.location
    ? { ...parsed.data.location, countryCode: parsed.data.location.countryCode || tenant.countryCode }
    : { countryCode: tenant.countryCode };
  const record = await db.CivicRecord.create({
    ...parsed.data,
    tenantId: tenant.tenantId,
    countryCode: tenant.countryCode,
    jurisdictionId: parsed.data.jurisdictionId || null,
    project,
    location,
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
  await recordEntryRevision({
    req,
    objectType: constants.OBJECT_TYPES.civicRecord,
    entry: record,
    source: 'create',
    summary: `${parsed.data.kind} civic record created`,
  });
  await logEntryEvent({
    eventType: 'civic.record.created',
    objectType: constants.OBJECT_TYPES.civicRecord,
    objectName: 'civicRecord',
    objectId: String(record._id),
    actorUserId: actorId(req),
    actorUsername: String(req.user?.username || ''),
    message: `${parsed.data.kind} civic record submitted`,
    payload: { tenantId: tenant.tenantId, kind: parsed.data.kind, title: parsed.data.title, parentId: parsed.data.parentId || null },
  });
  res.status(201).json({ record });
}

async function updateRecord(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (!await ensureCivicTenantRole(req, res, ['contributor', 'admin'])) return;
  const record = await db.CivicRecord.findOne({ _id: req.params.id, tenantId: tenantId(req) });
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
  const parentValidation = await validateParent(req, record.kind, parentId);
  if (!parentValidation.ok) {
    res.status(400).json({ message: parentValidation.message });
    return;
  }
  const jurisdictionId = parsed.data.jurisdictionId ?? (record.jurisdictionId ? String(record.jurisdictionId) : undefined);
  const jurisdictionValidation = await validateJurisdiction(req, jurisdictionId);
  if (!jurisdictionValidation.ok) {
    res.status(400).json({ message: jurisdictionValidation.message });
    return;
  }
  const project = parsed.data.project
    ? { ...parsed.data.project, currency: parsed.data.project.currency || req.civicTenant!.localization.currency }
    : undefined;
  Object.assign(record, parsed.data, {
    parentId: parentId || null,
    jurisdictionId: jurisdictionId || null,
    ...(project ? { project } : {}),
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
  await recordEntryRevision({
    req,
    objectType: constants.OBJECT_TYPES.civicRecord,
    entry: record,
    source: 'update',
    summary: 'Civic record details updated',
  });
  res.json({ record });
}

async function transitionRecord(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (!await ensureCivicTenantRole(req, res, ['reviewer', 'admin'])) return;
  const parsed = civicTransitionInput.safeParse(req.body || {});
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }
  const record = await db.CivicRecord.findOne({ _id: req.params.id, tenantId: tenantId(req) });
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
  await recordEntryRevision({
    req,
    objectType: constants.OBJECT_TYPES.civicRecord,
    entry: record,
    source: 'update',
    summary: 'Civic lifecycle decision recorded',
  });
  await logEntryEvent({
    scope: 'privileged',
    eventType: 'civic.record.transitioned',
    objectType: constants.OBJECT_TYPES.civicRecord,
    objectName: 'civicRecord',
    objectId: String(record._id),
    actorUserId: actorId(req),
    actorUsername: String(req.user?.username || ''),
    message: 'Civic lifecycle decision recorded',
    payload: {
      tenantId: tenantId(req),
      kind: record.kind,
      fromStatus: previousStatus,
      toStatus: record.status,
      fromStage: previousStage,
      toStage: record.stage,
      reason: parsed.data.reason,
    },
  });
  await notifySubscribers({
    target: {
      objectType: constants.OBJECT_TYPES.civicRecord,
      objectName: 'civicRecord',
      objectId: String(record._id),
    },
    type: 'civic_transition',
    title: 'Civic record updated',
    body: `${record.title} is now ${record.status} / ${record.stage}.`,
    link: `/civic/records/${record._id}`,
    trigger: 'screening',
    excludeUserIds: [actorId(req)],
    payload: { tenantId: tenantId(req), status: record.status, stage: record.stage },
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
  router.get('/tenant', getTenantMetadata);
  router.get('/jurisdictions', listJurisdictions);
  router.get('/overview', getOverview);
  router.get('/records', listRecords);
  router.get('/records/:id', getRecord);
  router.post('/records', createRecord);
  router.put('/records/:id', updateRecord);
  router.post('/records/:id/transition', transitionRecord);
  router.get('/candidates/compare', compareCandidates);
  registerCivicEntryLinkRoutes(router);
  registerCivicAdministrationRoutes(router);
};
