'use strict';

import type { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import appModForDb from '../../app';
import constants from '../../models/constants';
import { ensureCivicTenantRole, civicTenantRoles } from '../../services/civicAuthorizationService';
import {
  listCivicEntryLinks,
  validateLinkedEntry,
} from '../../services/civicEntryLinkService';
import { logEntryEvent } from '../../services/entryEventsService';
import { notifySubscribers } from '../../services/notificationsService';
import { CIVIC_ENTRY_RELATIONSHIPS } from '../../types/civicTenancy';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
const linkInput = z.object({
  relationship: z.enum(CIVIC_ENTRY_RELATIONSHIPS),
  objectId: z.string().trim().refine((value) => mongoose.isValidObjectId(value), 'Invalid entry id'),
});

function actorId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

async function scopedRecord(req: WikitruthRequest): Promise<Record<string, any> | null> {
  return db.CivicRecord.findOne({ _id: req.params.id || req.params.recordId, tenantId: req.civicTenant!.tenantId }).lean();
}

async function canManageRecord(req: WikitruthRequest, record: Record<string, any>): Promise<boolean> {
  if (String(record.createUserId || '') === actorId(req)) return true;
  const roles = await civicTenantRoles(req, req.civicTenant!.tenantId);
  return roles.has('reviewer') || roles.has('admin');
}

export function registerCivicEntryLinkRoutes(router: Router): void {
  router.get('/records/:id/links', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const record = await scopedRecord(req);
    if (!record || (record.private && String(record.createUserId || '') !== actorId(req))) {
      res.status(404).json({ success: false, message: 'Civic record not found' });
      return;
    }
    const roles = await civicTenantRoles(req, req.civicTenant!.tenantId);
    const links = await listCivicEntryLinks({
      tenantId: req.civicTenant!.tenantId,
      record,
      userId: actorId(req),
      isAdmin: roles.has('admin'),
    });
    res.json({ links, count: links.length });
  });

  router.post('/records/:id/links', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['contributor', 'reviewer', 'admin'])) return;
    const parsed = linkInput.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid civic entry link', details: parsed.error.issues });
      return;
    }
    const record = await scopedRecord(req);
    if (!record) {
      res.status(404).json({ success: false, message: 'Civic record not found' });
      return;
    }
    if (!await canManageRecord(req, record)) {
      res.status(403).json({ success: false, message: 'Only the contributor, reviewer, or tenant administrator may link entries' });
      return;
    }
    const roles = await civicTenantRoles(req, req.civicTenant!.tenantId);
    try {
      const target = await validateLinkedEntry({
        ...parsed.data,
        userId: actorId(req),
        isAdmin: roles.has('admin'),
      });
      const link = await db.CivicEntryLink.findOneAndUpdate(
        {
          tenantId: req.civicTenant!.tenantId,
          civicRecordId: record._id,
          relationship: parsed.data.relationship,
          objectType: target.objectType,
          objectId: parsed.data.objectId,
        },
        {
          $setOnInsert: {
            objectName: target.objectName,
            createUserId: actorId(req),
            createUsername: req.user?.username || '',
            createDate: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      await logEntryEvent({
        scope: 'privileged',
        eventType: 'civic.entry.linked',
        objectType: constants.OBJECT_TYPES.civicRecord,
        objectName: 'civicRecord',
        objectId: String(record._id),
        actorUserId: actorId(req),
        actorUsername: String(req.user?.username || ''),
        message: `${parsed.data.relationship} entry linked to civic record`,
        payload: { tenantId: req.civicTenant!.tenantId, relationship: parsed.data.relationship, targetObjectType: target.objectType, targetObjectId: parsed.data.objectId },
      });
      res.status(201).json({ link });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to link entry' });
    }
  });

  router.delete('/records/:recordId/links/:linkId', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['contributor', 'reviewer', 'admin'])) return;
    const record = await scopedRecord(req);
    if (!record) {
      res.status(404).json({ success: false, message: 'Civic record not found' });
      return;
    }
    if (!await canManageRecord(req, record)) {
      res.status(403).json({ success: false, message: 'Not allowed to remove this link' });
      return;
    }
    const link = await db.CivicEntryLink.findOneAndDelete({
      _id: req.params.linkId,
      tenantId: req.civicTenant!.tenantId,
      civicRecordId: record._id,
    }).lean();
    if (!link) {
      res.status(404).json({ success: false, message: 'Civic entry link not found' });
      return;
    }
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'civic.entry.unlinked',
      objectType: constants.OBJECT_TYPES.civicRecord,
      objectName: 'civicRecord',
      objectId: String(record._id),
      actorUserId: actorId(req),
      actorUsername: String(req.user?.username || ''),
      message: 'Wikitruth entry unlinked from civic record',
      payload: { tenantId: req.civicTenant!.tenantId, linkId: String(link._id) },
    });
    await notifySubscribers({
      target: { objectType: constants.OBJECT_TYPES.civicRecord, objectName: 'civicRecord', objectId: String(record._id) },
      type: 'civic_link_removed',
      title: 'Civic evidence link updated',
      link: `/civic/records/${record._id}`,
      trigger: 'issue',
      excludeUserIds: [actorId(req)],
      payload: { tenantId: req.civicTenant!.tenantId },
    });
    res.json({ success: true });
  });
}
