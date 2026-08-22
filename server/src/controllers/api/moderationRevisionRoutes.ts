'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  createChangeRequest,
  listChangeRequests,
  resolveChangeRequest,
  rollbackEntry,
} from '../../services/entryRevisionService';
import {
  ensureModerator,
  ensureReviewerOrAdmin,
  parseModerationTarget,
  toNumber,
} from './moderationShared';
import { requirePrivilegedPasskeyAssurance } from '../../services/privilegedAuthService';

function actor(req: WikitruthRequest): { actorId: string; actorUsername: string } {
  return {
    actorId: String(req.user?.id || req.user?._id || ''),
    actorUsername: String(req.user?.username || ''),
  };
}

function normalizedRevisionId(value: unknown): string {
  return String(value || '').trim().replace(/^W\//, '').replace(/^"|"$/g, '');
}

function agentAttribution(req: WikitruthRequest) {
  return {
    apiClientId: req.apiClient?.id || null,
    apiClientName: req.apiClient?.name || '',
    agentRunId: req.agentRun?.runId || '',
    agentModel: req.agentRun?.model || '',
    agentProvider: req.agentRun?.provider || '',
    agentPurpose: req.agentRun?.purpose || '',
    sourceManifest: req.agentRun?.sourceManifest || [],
  };
}

export function registerModerationRevisionRoutes(router: Router): void {
  router.post('/change-requests', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A change-request target is required' });
      return;
    }
    const expectedBaseRevisionId = normalizedRevisionId(
      req.get('if-match') || req.body?.baseRevisionId || req.body?.baseRevision,
    );
    if (req.apiClient && !expectedBaseRevisionId) {
      res.status(428).json({ success: false, message: 'Agent change requests require If-Match or baseRevisionId' });
      return;
    }
    try {
      const request = await createChangeRequest({
        objectType: target.objectType,
        objectId: target.id,
        proposedChanges: req.body?.proposedChanges || req.body?.changes,
        summary: String(req.body?.summary || '').trim(),
        expectedBaseRevisionId: expectedBaseRevisionId || undefined,
        ...agentAttribution(req),
        ...actor(req),
      });
      res.status(201).json({ success: true, request });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create change request';
      res.status(/stale/i.test(message) ? 409 : 400).json({
        success: false,
        message,
      });
    }
  });

  router.get('/change-requests', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureModerator(req, res)) {
      return;
    }
    const target = parseModerationTarget(req);
    const requests = await listChangeRequests({
      objectType: target?.objectType,
      objectId: target?.id,
      status: String(req.query.status || '').trim() || undefined,
    });
    res.json({ success: true, requests });
  });

  router.put('/change-requests/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (action !== 'accept' && action !== 'reject') {
      res.status(400).json({ success: false, message: 'Action must be accept or reject' });
      return;
    }
    try {
      const request = await resolveChangeRequest({
        id: String(req.params.id || ''),
        action,
        acceptedFields: Array.isArray(req.body?.acceptedFields)
          ? req.body.acceptedFields.map((field: unknown) => String(field || '').trim()).filter(Boolean)
          : undefined,
        decisionNote: String(req.body?.decisionNote || '').trim(),
        ...actor(req),
      });
      res.json({ success: true, request });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resolve change request';
      res.status(/stale/i.test(message) ? 409 : 400).json({ success: false, message });
    }
  });

  router.post('/rollback', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const objectType = toNumber(req.body?.objectType ?? req.body?.type);
    const objectId = String(req.body?.objectId || req.body?.id || '').trim();
    const revisionId = String(req.body?.revisionId || '').trim();
    if (!objectType || !objectId || !revisionId) {
      res.status(400).json({ success: false, message: 'objectType, objectId, and revisionId are required' });
      return;
    }
    try {
      const revision = await rollbackEntry({
        objectType,
        objectId,
        revisionId,
        reason: String(req.body?.reason || '').trim(),
        ...actor(req),
      });
      res.json({ success: true, revision });
    } catch (error) {
      res.status(409).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unable to roll back entry',
      });
    }
  });
}
