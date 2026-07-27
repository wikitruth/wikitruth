'use strict';

import type { Router } from 'express';
import appModForDb from '../../app';
import constants from '../../models/constants';
import { ensureCivicTenantRole, civicTenantRoles } from '../../services/civicAuthorizationService';
import { logEntryEvent } from '../../services/entryEventsService';
import { notifySubscribers } from '../../services/notificationsService';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

type CivicResponseDocument = Record<string, unknown> & {
  _id: unknown;
  civicRecordId: unknown;
  requestType: string;
  title: string;
  history: Array<Record<string, unknown>>;
  save: () => Promise<unknown>;
};
const db = (appModForDb as unknown as { db: { models: Record<string, unknown> } }).db.models as {
  CivicRecord: { findOne: (query: Record<string, unknown>) => { select: (fields: string) => { lean: () => Promise<Record<string, unknown> | null> } } };
  CivicResponseRequest: {
    find: (query: Record<string, unknown>) => { sort: (sort: Record<string, number>) => { limit: (limit: number) => { lean: () => Promise<Array<Record<string, unknown>>> } } };
    findOne: (query: Record<string, unknown>) => Promise<CivicResponseDocument | null>;
    create: (fields: Record<string, unknown>) => Promise<CivicResponseDocument>;
  };
};

function tenantId(req: WikitruthRequest): string { return String(req.civicTenant?.tenantId || '').trim().toLowerCase(); }
function actorId(req: WikitruthRequest): string { return String(req.user?._id || req.user?.id || ''); }
function evidenceUrls(value: unknown): string[] {
  return (Array.isArray(value) ? value : String(value || '').split(/\r?\n/))
    .map((item) => String(item || '').trim()).filter((item) => /^https:\/\//i.test(item)).slice(0, 10);
}

export function registerCivicResponseRoutes(router: Router): void {
  router.get('/records/:id/responses', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const record = await db.CivicRecord.findOne({ _id: req.params.id, tenantId: tenantId(req) }).select('_id').lean();
    if (!record) { res.status(404).json({ message: 'Civic record not found' }); return; }
    const roles = await civicTenantRoles(req, tenantId(req));
    const query: Record<string, unknown> = { tenantId: tenantId(req), civicRecordId: req.params.id };
    if (!roles.has('reviewer') && !roles.has('admin')) {
      query.$or = req.user ? [{ status: { $in: ['published', 'resolved'] } }, { createUserId: actorId(req) }] : [{ status: { $in: ['published', 'resolved'] } }];
    }
    const responses = await db.CivicResponseRequest.find(query).sort({ createDate: -1 }).limit(100).lean();
    res.json({ responses, count: responses.length });
  });

  router.post('/records/:id/responses', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['contributor', 'admin'])) return;
    const record = await db.CivicRecord.findOne({ _id: req.params.id, tenantId: tenantId(req) }).select('_id title').lean();
    if (!record) { res.status(404).json({ message: 'Civic record not found' }); return; }
    const requestType = String(req.body?.requestType || '');
    const title = String(req.body?.title || '').trim(); const content = String(req.body?.content || '').trim();
    if (!['subject_response', 'correction_request'].includes(requestType) || title.length < 3 || content.length < 20) {
      res.status(400).json({ message: 'A valid response type, title, and detailed content are required' }); return;
    }
    const now = new Date();
    const response = await db.CivicResponseRequest.create({
      tenantId: tenantId(req), civicRecordId: record._id, requestType,
      claimedRelationship: String(req.body?.claimedRelationship || '').trim().slice(0, 200),
      title, content, evidenceUrls: evidenceUrls(req.body?.evidenceUrls), status: 'pending',
      createUserId: actorId(req), createUsername: req.user?.username || '', createDate: now, editDate: now,
      history: [{ action: 'submitted', actorUserId: actorId(req), actorUsername: req.user?.username || '', date: now }],
    });
    await logEntryEvent({
      eventType: 'civic.response.submitted', objectType: constants.OBJECT_TYPES.civicRecord, objectName: 'civicRecord',
      objectId: String(record._id), actorUserId: actorId(req), actorUsername: String(req.user?.username || ''),
      message: `${requestType} submitted`, payload: { tenantId: tenantId(req), responseId: String(response._id), requestType },
    });
    res.status(201).json({ response });
  });

  router.post('/responses/:id/review', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['reviewer', 'admin'])) return;
    const action = String(req.body?.action || ''); const reason = String(req.body?.reason || '').trim();
    if (!['publish', 'reject', 'resolve'].includes(action) || reason.length < 10) {
      res.status(400).json({ message: 'Publish, reject, or resolve with a reason of at least 10 characters' }); return;
    }
    const response = await db.CivicResponseRequest.findOne({ _id: req.params.id, tenantId: tenantId(req) });
    if (!response) { res.status(404).json({ message: 'Civic response not found' }); return; }
    const status = action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : 'resolved';
    const now = new Date(); response.status = status; response.reviewUserId = actorId(req);
    response.reviewUsername = req.user?.username || ''; response.reviewReason = reason; response.reviewDate = now; response.editDate = now;
    response.history.push({ action: status, reason, actorUserId: actorId(req), actorUsername: req.user?.username || '', date: now });
    await response.save();
    await logEntryEvent({
      scope: 'privileged', eventType: `civic.response.${status}`, objectType: constants.OBJECT_TYPES.civicRecord,
      objectName: 'civicRecord', objectId: String(response.civicRecordId), actorUserId: actorId(req),
      actorUsername: String(req.user?.username || ''), message: reason,
      payload: { tenantId: tenantId(req), responseId: String(response._id), requestType: response.requestType, status },
    });
    if (status === 'published' || status === 'resolved') await notifySubscribers({
      target: { objectType: constants.OBJECT_TYPES.civicRecord, objectName: 'civicRecord', objectId: String(response.civicRecordId) },
      type: 'civic_response', trigger: 'reply', title: status === 'published' ? 'Subject response published' : 'Correction request resolved',
      body: response.title, link: `/civic/records/${response.civicRecordId}`, excludeUserIds: [actorId(req)],
      payload: { responseId: String(response._id), status },
    });
    res.json({ response });
  });
}
