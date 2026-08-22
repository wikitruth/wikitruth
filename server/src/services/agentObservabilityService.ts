'use strict';

import type { Application, NextFunction } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import { resolveAgentOperationPolicy } from './agentOperationPolicy';

const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

export type AgentOperationEventKind =
  | 'authentication_denied' | 'request_denied' | 'rate_limited'
  | 'idempotent_replay' | 'idempotency_conflict'
  | 'job_queued' | 'job_completed' | 'job_failed' | 'job_cancelled'
  | 'advice_submitted' | 'advice_countersigned' | 'advice_rejected' | 'advice_stale';

type AgentOperationEventModel = {
  create?: (value: Record<string, unknown>) => Promise<unknown>;
};

function eventModel(app: Application): AgentOperationEventModel | undefined {
  return (app as unknown as { db?: { models?: { AgentOperationEvent?: AgentOperationEventModel } } })
    .db?.models?.AgentOperationEvent;
}

function safeMetadataValue(value: unknown): string | number | boolean | null | Array<string | number | boolean | null> | undefined {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 500);
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 20)
      .map(safeMetadataValue)
      .filter((item): item is string | number | boolean | null => !Array.isArray(item) && typeof item !== 'undefined');
  }
  return undefined;
}

function boundedMetadata(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 20).flatMap(([key, item]) => {
    const safeValue = safeMetadataValue(item);
    return typeof safeValue === 'undefined' ? [] : [[key.slice(0, 80), safeValue]];
  }));
}

export async function persistAgentOperationEvent(app: Application, input: {
  kind: AgentOperationEventKind;
  apiClientId?: string;
  clientId?: string;
  agentRunId?: string;
  operationId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  code?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const model = eventModel(app);
  if (!model?.create) return;
  const now = new Date();
  await model.create({
    ...input,
    apiClientId: input.apiClientId || null,
    clientId: String(input.clientId || '').slice(0, 120),
    agentRunId: String(input.agentRunId || '').slice(0, 120),
    operationId: String(input.operationId || '').slice(0, 160),
    method: String(input.method || '').slice(0, 12),
    path: String(input.path || '').slice(0, 500),
    statusCode: Number(input.statusCode || 0),
    code: String(input.code || '').slice(0, 120),
    metadata: boundedMetadata(input.metadata),
    occurredAt: now,
    expiresAt: new Date(now.getTime() + RETENTION_MS),
  });
}

export function recordAgentOperationEvent(app: Application, input: Parameters<typeof persistAgentOperationEvent>[1]): void {
  void persistAgentOperationEvent(app, input).catch((error: unknown) => console.error('Agent operation event failed:', error));
}

function policyPath(path: string): string {
  return path.replace(/^\/api(?:\/v1)?/, '') || '/';
}

export function observeAgentRequests(req: WikitruthRequest, res: WikitruthResponse, next: NextFunction): void {
  if (!req.apiClient) {
    next();
    return;
  }
  let responseCode = '';
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const error = payload.error && typeof payload.error === 'object'
      ? payload.error as Record<string, unknown>
      : {};
    responseCode = String(error.code || payload.code || '');
    return originalJson(body);
  }) as typeof res.json;
  res.on('finish', () => {
    if (res.statusCode < 400) return;
    const path = policyPath(req.path);
    const policy = resolveAgentOperationPolicy(req.method, path);
    recordAgentOperationEvent(req.app, {
      kind: 'request_denied', apiClientId: req.apiClient!.id, clientId: req.apiClient!.clientId,
      agentRunId: req.agentRun?.runId || '', operationId: policy?.operationId || '', method: req.method,
      path, statusCode: res.statusCode, code: responseCode || `HTTP_${res.statusCode}`,
    });
  });
  next();
}
