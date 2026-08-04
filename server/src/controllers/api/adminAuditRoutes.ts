'use strict';

import type { Router } from 'express';

import { listPrivilegedEvents, verifyPrivilegedEventChain } from '../../services/entryEventsService';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { queryOf, type AdminAuditEventsQueryContract } from '../../types/controllerContracts';

type EnsureAdmin = (req: WikitruthRequest, res: WikitruthResponse) => boolean;

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function registerAdminAuditRoutes(router: Router, ensureAdmin: EnsureAdmin): void {
  router.get('/audit-events', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const query = queryOf<AdminAuditEventsQueryContract>(req);
    const page = toPositiveInt(query.page, 1);
    const limit = Math.min(toPositiveInt(query.limit, 25), 100);
    const objectType = Number(query.objectType || 0);
    const eventTypes = String(query.eventTypes || '').split(',').map((item) => item.trim()).filter(Boolean);
    const result = await listPrivilegedEvents({
      page, limit, eventTypes, objectType: objectType > 0 ? objectType : null,
    });
    res.json({ success: true, events: result.items, total: result.total, page: result.page, limit: result.limit });
  });

  router.get('/audit-events/verify', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const verification = await verifyPrivilegedEventChain();
    res.status(verification.valid ? 200 : 409).json({ success: verification.valid, verification });
  });
}

