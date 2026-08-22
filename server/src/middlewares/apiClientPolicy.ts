'use strict';

import type { NextFunction } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import { entryTypeFromOperationPath, resolveAgentOperationPolicy } from '../services/agentOperationPolicy';
import { resolveCivicTenant } from '../services/civicTenantService';

const MODEL_BY_ENTRY_TYPE: Record<string, string> = {
  topic: 'Topic', argument: 'Argument', question: 'Question', answer: 'Answer',
  artifact: 'Artifact', issue: 'Issue', opinion: 'Opinion',
};
const PARENT_FIELDS = ['parentId', 'ownerId', 'topicId', 'questionId', 'groupId', 'categoryId'];

function fail(res: WikitruthResponse, code: string, message: string): void {
  res.status(403).json({ success: false, error: { code, message } });
}

function requestEntryId(path: string): string | null {
  return /^\/(?:topics|arguments|questions|answers|artifacts|issues|opinions)\/entry\/([^/]+)/i.exec(path)?.[1] || null;
}

function hasSource(req: WikitruthRequest): boolean {
  const body = req.body || {};
  const manifestHeader = req.get('x-agent-source-manifest');
  let manifestHasItems = false;
  if (manifestHeader) {
    try {
      const parsed = JSON.parse(manifestHeader) as unknown;
      manifestHasItems = Array.isArray(parsed) && parsed.length > 0;
    } catch (_error) {
      manifestHasItems = false;
    }
  }
  return ['references', 'source', 'archiveUrl', 'checksum'].some((field) => String(body[field] || '').trim())
    || Boolean(req.agentRun?.sourceManifest?.length)
    || manifestHasItems;
}

function models(req: WikitruthRequest): Record<string, any> {
  return (req.app as unknown as { db?: { models?: Record<string, any> } }).db?.models || {};
}

async function leanById(model: any, id: string): Promise<Record<string, unknown> | null> {
  if (!model?.findById || !id) return null;
  const query = model.findById(id);
  return typeof query?.lean === 'function' ? query.lean() : await query;
}

function parentIds(value: Record<string, unknown>): string[] {
  return PARENT_FIELDS.map((field) => String(value[field] || '').trim()).filter(Boolean);
}

async function withinParentRoots(req: WikitruthRequest, startingIds: string[], roots: string[]): Promise<boolean> {
  if (!roots.length) return true;
  const allowed = new Set(roots);
  const queue = [...startingIds];
  const visited = new Set<string>();
  const db = models(req);
  while (queue.length && visited.size < 50) {
    const id = queue.shift()!;
    if (allowed.has(id)) return true;
    if (visited.has(id) || !/^[a-f\d]{24}$/i.test(id)) continue;
    visited.add(id);
    for (const modelName of ['Topic', 'Question', 'Argument', 'Artifact', 'Issue', 'Opinion', 'Group']) {
      const record = await leanById(db[modelName], id);
      if (!record) continue;
      queue.push(...parentIds(record));
      break;
    }
  }
  return false;
}

export async function enforceApiClientPolicy(
  req: WikitruthRequest,
  res: WikitruthResponse,
  next: NextFunction,
): Promise<void> {
  if (!req.apiClient) {
    next();
    return;
  }
  const operation = resolveAgentOperationPolicy(req.method, req.path);
  if (!operation?.agentAllowed) {
    next();
    return;
  }
  const credentialPolicy = req.apiClient.policy;
  const entryType = operation.entryTypeFromPath ? entryTypeFromOperationPath(req.path) : null;
  if (entryType && credentialPolicy.entryTypes.length
    && !credentialPolicy.entryTypes.includes(entryType as typeof credentialPolicy.entryTypes[number])) {
    fail(res, 'AGENT_ENTRY_TYPE_RESTRICTED', `This credential is not permitted to access ${entryType} entries.`);
    return;
  }
  if (operation.tenantScoped && credentialPolicy.tenantIds.length) {
    const tenant = req.civicTenant || await resolveCivicTenant(req);
    if (!credentialPolicy.tenantIds.includes(tenant.tenantId)) {
      fail(res, 'AGENT_TENANT_RESTRICTED', 'This credential is not permitted to access the selected civic tenant.');
      return;
    }
  }
  if (credentialPolicy.maxVisibility === 'public_only' && req.body?.private === true) {
    fail(res, 'AGENT_VISIBILITY_RESTRICTED', 'This credential may create only public contributions.');
    return;
  }
  if (credentialPolicy.sourceRequired
    && ['create', 'propose_edit', 'civic_create', 'civic_update'].includes(String(operation.mutationKind || ''))
    && !hasSource(req)) {
    fail(res, 'AGENT_SOURCE_REQUIRED', 'This credential requires a source reference or source manifest for content mutations.');
    return;
  }

  const entryId = requestEntryId(req.path);
  let entry: Record<string, unknown> | null = null;
  if (entryId && entryType) {
    const modelName = MODEL_BY_ENTRY_TYPE[entryType];
    entry = modelName ? await leanById(models(req)[modelName], entryId) : null;
    if (entry && credentialPolicy.maxVisibility === 'public_only' && entry.private === true) {
      fail(res, 'AGENT_VISIBILITY_RESTRICTED', 'This credential cannot read or modify private content.');
      return;
    }
    if (entry && operation.mutationKind === 'propose_edit' && credentialPolicy.ownContentOnly
      && String(entry.createUserId || '') !== String(req.user?._id || req.user?.id || '')) {
      fail(res, 'AGENT_OWNERSHIP_RESTRICTED', 'This credential may propose edits only for content owned by its accountable user.');
      return;
    }
  }

  if (credentialPolicy.parentRootIds.length
    && ['create', 'propose_edit', 'graph_create'].includes(String(operation.mutationKind || ''))) {
    const startingIds = [...parentIds((req.body || {}) as Record<string, unknown>), ...(entry ? parentIds(entry) : [])];
    if (!await withinParentRoots(req, startingIds, credentialPolicy.parentRootIds)) {
      fail(res, 'AGENT_PARENT_ROOT_RESTRICTED', 'This contribution is outside the credential parent-root boundary.');
      return;
    }
  }
  next();
}
