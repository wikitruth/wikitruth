'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import { subscribeRealtime, type RealtimeEvent } from '../../services/realtimeEvents';
import type { ApiClientScope } from '../../services/apiClientService';
import { listAgentOperationPolicies } from '../../services/agentOperationPolicy';
import { recordAgentOperationEvent } from '../../services/agentObservabilityService';

type AgentRuntimeServices = typeof import('../../services/agentRuntimeServices');
let cachedRuntimeServices: AgentRuntimeServices | null = null;

function runtimeServices(): AgentRuntimeServices {
  if (!cachedRuntimeServices) {
    cachedRuntimeServices = require('../../services/agentRuntimeServices') as AgentRuntimeServices;
  }
  return cachedRuntimeServices;
}

const ENTRY_TYPES: Record<string, number> = {
  topic: constants.OBJECT_TYPES.topic,
  argument: constants.OBJECT_TYPES.argument,
  question: constants.OBJECT_TYPES.question,
  answer: constants.OBJECT_TYPES.answer,
  artifact: constants.OBJECT_TYPES.artifact,
  issue: constants.OBJECT_TYPES.issue,
  opinion: constants.OBJECT_TYPES.opinion,
};

function requireAgent(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (!req.apiClient || !req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'AGENT_AUTHENTICATION_REQUIRED', message: 'A valid agent credential is required.' },
    });
    return false;
  }
  return true;
}

function models(req: WikitruthRequest): Record<string, any> {
  return (req.app as unknown as { db: { models: Record<string, any> } }).db.models;
}

function requireScope(req: WikitruthRequest, res: WikitruthResponse, scope: ApiClientScope): boolean {
  if (!req.apiClient?.scopes.includes(scope)) {
    res.status(403).json({
      success: false,
      error: { code: 'AGENT_SCOPE_REQUIRED', message: `The agent credential requires the ${scope} scope.` },
    });
    return false;
  }
  return true;
}

function boundedPage(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), max) : fallback;
}

function validationScope(operation: string): ApiClientScope | null {
  if (operation === 'contribution') return 'entries:create';
  if (operation === 'entry_edit') return 'entries:propose-edit';
  if (operation === 'graph_link') return 'graph:write';
  if (operation === 'verdict_advice') return 'moderation:advise';
  if (operation === 'civic_record') return 'civic:contribute';
  if (operation === 'translation') return 'translations:write';
  if (operation === 'debate_contribution') return 'debates:participate';
  return null;
}

async function validateDryRun(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (Array.isArray(req.body?.commands)) {
    const { validateAgentCommandForContext } = runtimeServices();
    const commands = req.body.commands as unknown[];
    const maximum = req.apiClient?.policy.maxBatchSize || 25;
    if (!commands.length || commands.length > maximum) {
      res.status(400).json({ success: false, dryRun: true, valid: false, error: { code: 'AGENT_BATCH_SIZE_INVALID', message: `Provide 1 to ${maximum} commands.` } });
      return;
    }
    const context = { app: req.app, apiClient: req.apiClient!, user: req.user!, agentRun: req.agentRun! };
    const results = await Promise.all(commands.map((command, index) => validateAgentCommandForContext(command, index, context)));
    const commandIds = results.map((result) => result.command?.commandId).filter(Boolean);
    const duplicateCommandIds = commandIds.filter((id, index) => commandIds.indexOf(id) !== index);
    res.json({
      success: true, dryRun: true,
      valid: results.every((result) => result.valid) && duplicateCommandIds.length === 0,
      maximumBatchSize: maximum,
      duplicateCommandIds: Array.from(new Set(duplicateCommandIds)),
      results,
      automaticFinalDecision: false,
      normalizedAgentRun: req.agentRun || null,
    });
    return;
  }
  const operation = String(req.body?.operation || 'contribution').trim().toLowerCase();
  const requiredScope = validationScope(operation);
  if (!requiredScope) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_OPERATION_INVALID', message: 'Unsupported validation operation.' } });
    return;
  }
  if (!requireScope(req, res, requiredScope)) return;
  const payload = req.body?.payload && typeof req.body.payload === 'object' && !Array.isArray(req.body.payload)
    ? req.body.payload as Record<string, unknown> : {};
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];
  let duplicates: Array<Record<string, unknown>> = [];

  if (operation === 'contribution') {
    const entryType = String(req.body?.entryType || '').trim().toLowerCase();
    const objectType = ENTRY_TYPES[entryType];
    if (!objectType) errors.push({ field: 'entryType', message: 'A supported entryType is required.' });
    const title = String(payload.title || '').trim();
    const content = String(payload.content || '').trim();
    if (!title && !['answer', 'opinion'].includes(entryType)) errors.push({ field: 'payload.title', message: 'A title is required.' });
    if (!title && !content) errors.push({ field: 'payload.content', message: 'A title or content body is required.' });
    if (!payload.ownerId && !payload.parentId && entryType !== 'topic') {
      warnings.push({ field: 'payload.ownerId', message: 'Confirm the intended parent or owner before mutation.' });
    }
    if (objectType && !errors.length) {
      // Load only for dry runs so identity/capability checks stay datastore-light.
      const { findDuplicateCandidatesForDraft } = runtimeServices();
      duplicates = await findDuplicateCandidatesForDraft(objectType, payload) as unknown as Array<Record<string, unknown>>;
      if (duplicates.some((candidate) => candidate.rule === 'exact_title' || candidate.rule === 'exact_content')) {
        errors.push({ field: 'payload', message: 'An exact duplicate exists in this contribution scope.' });
      }
    }
  } else if (operation === 'graph_link') {
    if (!String(payload.parentId || '').trim()) errors.push({ field: 'payload.parentId', message: 'parentId is required.' });
    if (!String(payload.targetId || '').trim()) errors.push({ field: 'payload.targetId', message: 'targetId is required.' });
    if (!['child', 'support', 'oppose', 'related', 'evidence', 'source', 'dependency', 'supports', 'refutes', 'qualifies', 'background'].includes(String(payload.relationship || ''))) {
      errors.push({ field: 'payload.relationship', message: 'A supported graph relationship is required.' });
    }
  } else if (operation === 'entry_edit') {
    if (!String(req.body?.entryType || '').trim()) errors.push({ field: 'entryType', message: 'A supported entryType is required.' });
    if (!String(payload.entryId || '').trim()) errors.push({ field: 'payload.entryId', message: 'entryId is required.' });
    if (!String(payload.baseRevision || '').trim()) errors.push({ field: 'payload.baseRevision', message: 'baseRevision is required to prevent stale edits.' });
    if (!payload.proposedChanges || typeof payload.proposedChanges !== 'object') errors.push({ field: 'payload.proposedChanges', message: 'proposedChanges are required.' });
    warnings.push({ field: 'operation', message: 'Accepted content is never replaced directly; the edit enters human review as a change request.' });
  } else if (operation === 'verdict_advice') {
    if (!['factual', 'ethical'].includes(String(payload.channel || ''))) errors.push({ field: 'payload.channel', message: 'Channel must be factual or ethical.' });
    if (String(payload.rationale || '').trim().length < 10) errors.push({ field: 'payload.rationale', message: 'A substantive rationale is required.' });
    warnings.push({ field: 'operation', message: 'Agent analysis is advisory and cannot count toward consensus until a human reviewer countersigns it.' });
  } else if (operation === 'civic_record') {
    const { validateAgentCivicDraft } = runtimeServices();
    const civicValidation = await validateAgentCivicDraft(
      req.body?.tenantId ?? payload.tenantId,
      payload,
      req.apiClient?.policy.tenantIds || [],
    );
    errors.push(...civicValidation.errors);
    warnings.push(...civicValidation.warnings);
  } else if (operation === 'translation') {
    if (!String(payload.locale || '').trim()) errors.push({ field: 'payload.locale', message: 'locale is required.' });
    if (String(payload.content || '').trim().length < 10) errors.push({ field: 'payload.content', message: 'Translated content is required.' });
    warnings.push({ field: 'operation', message: 'Agent translations remain pending until reviewed by a person.' });
  } else if (operation === 'debate_contribution') {
    if (!String(payload.debateId || '').trim()) errors.push({ field: 'payload.debateId', message: 'debateId is required.' });
    if (String(payload.content || '').trim().length < 10) errors.push({ field: 'payload.content', message: 'Contribution content is required.' });
    warnings.push({ field: 'operation', message: 'Agent authorship is displayed separately from human participants.' });
  }

  res.json({
    success: true,
    dryRun: true,
    valid: errors.length === 0,
    operation,
    requiredScope,
    screening: operation === 'contribution' ? 'pending' : null,
    automaticFinalDecision: false,
    errors,
    warnings,
    duplicates,
    normalizedAgentRun: req.agentRun || null,
  });
}

function writeSse(res: WikitruthResponse, event: RealtimeEvent): void {
  res.write('event: message\n');
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export = function (router: Router) {
  router.get('/identity', function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    res.json({
      success: true,
      client: req.apiClient,
      accountableUser: { id: String(req.user?._id || req.user?.id || ''), username: String(req.user?.username || '') },
    });
  });

  router.get('/capabilities', function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const scopes = new Set(req.apiClient?.scopes || []);
    const policies = listAgentOperationPolicies();
    const operations = policies.filter((policy) => policy.agentAllowed
      && (!policy.requiredScope || scopes.has(policy.requiredScope)))
      .map((policy) => ({
        operationId: policy.operationId,
        method: policy.method,
        pathPattern: policy.pattern,
        requiredScope: policy.requiredScope || null,
        mutationKind: policy.mutationKind || null,
      }));
    res.json({
      success: true,
      apiVersion: 'v1',
      authentication: 'Bearer wt_agent_<clientId>.<secret>',
      reliability: {
        idempotencyHeader: 'Idempotency-Key',
        runHeader: 'X-Agent-Run-Id',
        attributionHeaders: ['X-Agent-Model', 'X-Agent-Provider', 'X-Agent-Purpose', 'X-Agent-Source-Manifest'],
        dryRunEndpoint: '/api/v1/agent/validate',
      },
      scopes: Array.from(scopes),
      credentialPolicy: req.apiClient?.policy,
      contributionContract: {
        screening: 'pending', duplicateChecks: true, contributorOnboarding: true,
        acceptedEdits: 'reviewed_change_request', automaticVerdict: false,
        verdictAdvice: 'human_countersign_required', attribution: 'api_client_accountable_user_and_agent_run',
      },
      endpoints: {
        read: scopes.has('entries:read') ? ['/api/v1/topics', '/api/v1/arguments', '/api/v1/questions', '/api/v1/answers', '/api/v1/artifacts', '/api/v1/issues', '/api/v1/opinions'] : [],
        create: scopes.has('entries:create') ? ['/api/v1/topics', '/api/v1/arguments', '/api/v1/questions', '/api/v1/answers', '/api/v1/artifacts', '/api/v1/issues', '/api/v1/opinions'] : [],
        proposeEdit: scopes.has('entries:propose-edit') ? ['/api/v1/{entryType}/entry/{id}', '/api/v1/moderation/change-requests'] : [],
        graph: scopes.has('graph:write') ? ['/api/v1/outline/link'] : [],
        civicRead: scopes.has('civic:read') ? ['/api/v1/civic/records', '/api/v1/tenants/{tenantId}/civic/records'] : [],
        civicContribute: scopes.has('civic:contribute') ? ['/api/v1/civic/records', '/api/v1/tenants/{tenantId}/civic/records'] : [],
        moderationAdvice: scopes.has('moderation:advise') ? ['/api/v1/moderation/verdict-advice', '/api/v1/moderation/signals', '/api/v1/moderation/appeals'] : [],
        translations: scopes.has('translations:write') ? ['/api/v1/translations/{objectName}/{id}'] : [],
        debates: scopes.has('debates:participate') ? ['/api/v1/structured-debates/{id}/contributions'] : [],
        operations,
      },
    });
  });

  router.post('/validate', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    await validateDryRun(req, res);
  });

  router.get('/activity', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const page = boundedPage(req.query.page, 1, 10_000);
    const limit = boundedPage(req.query.limit, 25, 100);
    const cursor = String(req.query.cursor || '').trim();
    if (cursor && !/^[a-f\d]{24}$/i.test(cursor)) {
      res.status(400).json({ success: false, error: { code: 'CURSOR_INVALID', message: 'cursor must be a revision ID returned by this collection.' } });
      return;
    }
    const baseQuery: Record<string, unknown> = { apiClientId: req.apiClient!.id };
    const runId = String(req.query.runId || '').trim();
    if (runId) baseQuery.agentRunId = runId;
    const query = cursor ? { ...baseQuery, _id: { $lt: cursor } } : baseQuery;
    const db = models(req);
    const revisionsQuery = db.EntryRevision.find(query).sort({ _id: -1 });
    if (!cursor && page > 1) revisionsQuery.skip((page - 1) * limit);
    const [total, rows] = await Promise.all([
      db.EntryRevision.countDocuments(baseQuery),
      revisionsQuery.limit(limit + 1).select('-snapshot').lean(),
    ]);
    const hasMore = rows.length > limit;
    const revisions = hasMore ? rows.slice(0, limit) : rows;
    res.json({
      success: true, page, limit, total, revisions,
      nextCursor: hasMore ? String(revisions.at(-1)?._id || '') : null,
    });
  });

  router.get('/runs/:runId', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const runId = String(req.params.runId || '').trim();
    const db = models(req);
    const [requests, revisions, jobs] = await Promise.all([
      db.IdempotencyRecord.find({ apiClientId: req.apiClient!.id, agentRunId: runId })
        .sort({ createDate: -1 }).select('-responseBody -keyHash -fingerprint').lean(),
      db.EntryRevision.find({ apiClientId: req.apiClient!.id, agentRunId: runId })
        .sort({ createDate: -1 }).select('-snapshot').lean(),
      db.AgentJob.find({ apiClientId: req.apiClient!.id, agentRunId: runId })
        .sort({ createDate: -1 }).select('-commands').lean(),
    ]);
    const status = requests.some((request: Record<string, unknown>) => request.status === 'pending')
      || jobs.some((job: Record<string, unknown>) => ['queued', 'running', 'cancel_requested'].includes(String(job.status || '')))
      ? 'processing' : requests.length || revisions.length || jobs.length ? 'completed' : 'not_found';
    res.json({ success: true, runId, status, requests, revisions, jobs });
  });

  router.get('/jobs', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const { resumeAgentJobs } = runtimeServices();
    void resumeAgentJobs(req.app);
    const limit = boundedPage(req.query.limit, 25, 100);
    const cursor = String(req.query.cursor || '').trim();
    if (cursor && !/^[a-f\d]{24}$/i.test(cursor)) {
      res.status(400).json({ success: false, error: { code: 'CURSOR_INVALID', message: 'cursor must be a job ID returned by this collection.' } });
      return;
    }
    const query: Record<string, unknown> = { apiClientId: req.apiClient!.id };
    if (cursor) query._id = { $lt: cursor };
    const jobs = await models(req).AgentJob.find(query).sort({ _id: -1 }).limit(limit + 1).select('-commands').lean();
    const hasMore = jobs.length > limit;
    const items = hasMore ? jobs.slice(0, limit) : jobs;
    res.json({ success: true, items, nextCursor: hasMore ? String(items.at(-1)?._id || '') : null });
  });

  router.post('/jobs', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const { validateAgentCommandForContext, scheduleAgentJob } = runtimeServices();
    const commands = Array.isArray(req.body?.commands) ? req.body.commands as unknown[] : [];
    const maximum = req.apiClient!.policy.maxBatchSize;
    if (!commands.length || commands.length > maximum) {
      res.status(400).json({ success: false, error: { code: 'AGENT_BATCH_SIZE_INVALID', message: `Provide 1 to ${maximum} commands.` } });
      return;
    }
    const context = { app: req.app, apiClient: req.apiClient!, user: req.user!, agentRun: req.agentRun! };
    const validations = await Promise.all(commands.map((command, index) => validateAgentCommandForContext(command, index, context)));
    const commandIds = validations.map((result) => result.command?.commandId).filter(Boolean);
    const duplicates = commandIds.filter((id, index) => commandIds.indexOf(id) !== index);
    if (validations.some((result) => !result.valid) || duplicates.length) {
      res.status(400).json({ success: false, error: { code: 'AGENT_JOB_INVALID', message: 'Every job command must pass validation and use a unique commandId.' }, validations, duplicateCommandIds: Array.from(new Set(duplicates)) });
      return;
    }
    const normalizedCommands = validations.map((result) => result.command);
    const job = await models(req).AgentJob.create({
      apiClientId: req.apiClient!.id,
      accountableUserId: req.apiClient!.userId,
      agentRunId: req.agentRun!.runId,
      agentModel: req.agentRun!.model,
      agentProvider: req.agentRun!.provider,
      agentPurpose: req.agentRun!.purpose,
      sourceManifest: req.agentRun!.sourceManifest,
      status: 'queued', commands: normalizedCommands, results: [], nextIndex: 0,
      createDate: new Date(), editDate: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    recordAgentOperationEvent(req.app, {
      kind: 'job_queued', apiClientId: req.apiClient!.id, clientId: req.apiClient!.clientId,
      agentRunId: req.agentRun!.runId, operationId: 'agent.jobs.create', method: 'POST', path: '/agent/jobs',
      statusCode: 202, code: 'AGENT_JOB_QUEUED', metadata: { jobId: String(job._id || ''), commandCount: commands.length },
    });
    scheduleAgentJob(req.app, String(job._id || ''));
    res.status(202).json({ success: true, job: { id: String(job._id || ''), status: 'queued', commandCount: commands.length, agentRunId: req.agentRun!.runId } });
  });

  router.get('/jobs/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const { resumeAgentJobs } = runtimeServices();
    void resumeAgentJobs(req.app);
    const job = await models(req).AgentJob.findOne({ _id: req.params.id, apiClientId: req.apiClient!.id }).lean();
    if (!job) {
      res.status(404).json({ success: false, error: { code: 'AGENT_JOB_NOT_FOUND', message: 'Agent job not found.' } });
      return;
    }
    res.json({ success: true, job });
  });

  router.post('/jobs/:id/cancel', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const { scheduleAgentJob } = runtimeServices();
    const db = models(req);
    const job = await db.AgentJob.findOne({ _id: req.params.id, apiClientId: req.apiClient!.id }).lean();
    if (!job) {
      res.status(404).json({ success: false, error: { code: 'AGENT_JOB_NOT_FOUND', message: 'Agent job not found.' } });
      return;
    }
    if (!['queued', 'running', 'cancel_requested'].includes(String(job.status || ''))) {
      res.status(409).json({ success: false, error: { code: 'AGENT_JOB_NOT_CANCELLABLE', message: 'The job is already in a terminal state.' } });
      return;
    }
    const nextStatus = job.status === 'queued' ? 'cancelled' : 'cancel_requested';
    const update: Record<string, unknown> = { status: nextStatus, editDate: new Date() };
    if (nextStatus === 'cancelled') update.completedDate = new Date();
    await db.AgentJob.updateOne(
      { _id: job._id, apiClientId: req.apiClient!.id, status: job.status }, { $set: update },
    );
    if (nextStatus === 'cancel_requested') scheduleAgentJob(req.app, String(job._id || ''));
    res.status(202).json({ success: true, job: { id: String(job._id || ''), status: nextStatus } });
  });

  router.get('/events', function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as WikitruthResponse & { flushHeaders?: () => void }).flushHeaders?.();
    writeSse(res, { type: 'agent.connected', data: { apiClientId: req.apiClient!.id } });
    const unsubscribe = subscribeRealtime((event) => {
      const data = event.data && typeof event.data === 'object' ? event.data as Record<string, unknown> : {};
      if (String(data.apiClientId || '') === req.apiClient!.id && event.type.startsWith('agent.')) writeSse(res, event);
    });
    const heartbeat = setInterval(() => writeSse(res, { type: 'agent.heartbeat' }), 30_000);
    req.on('close', () => { clearInterval(heartbeat); unsubscribe(); res.end(); });
  });
};
