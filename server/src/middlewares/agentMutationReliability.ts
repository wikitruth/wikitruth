'use strict';

import { createHash } from 'crypto';
import type { NextFunction } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_STALE_MS = 10 * 60 * 1000;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue((value as Record<string, unknown>)[key]);
      return result;
    }, {});
  }
  return value;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function boundedHeader(req: WikitruthRequest, name: string, max: number): string {
  return String(req.get(name) || '').trim().slice(0, max);
}

function sourceManifest(req: WikitruthRequest): Array<Record<string, string>> {
  const raw = req.body?.agentMetadata?.sourceManifest;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 50).map((item: unknown) => {
    const source = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return {
      url: String(source.url || '').trim().slice(0, 1000),
      artifactId: String(source.artifactId || '').trim().slice(0, 100),
      checksum: String(source.checksum || '').trim().slice(0, 200),
      note: String(source.note || '').trim().slice(0, 500),
    };
  }).filter((item) => item.url || item.artifactId || item.checksum || item.note);
}

function attachRunContext(req: WikitruthRequest): void {
  req.agentRun = {
    runId: boundedHeader(req, 'x-agent-run-id', 120),
    model: boundedHeader(req, 'x-agent-model', 160),
    provider: boundedHeader(req, 'x-agent-provider', 120),
    purpose: boundedHeader(req, 'x-agent-purpose', 500),
    sourceManifest: sourceManifest(req),
  };
}

function fail(res: WikitruthResponse, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

function duplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && Number((error as { code?: unknown }).code) === 11000);
}

export async function enforceAgentMutationReliability(
  req: WikitruthRequest,
  res: WikitruthResponse,
  next: NextFunction,
): Promise<void> {
  if (!req.apiClient) {
    next();
    return;
  }
  attachRunContext(req);
  const agentRun = req.agentRun!;
  if (SAFE_METHODS.has(req.method) || req.path === '/agent/validate') {
    next();
    return;
  }
  if (!agentRun.runId || !/^[A-Za-z0-9._:-]{4,120}$/.test(agentRun.runId)) {
    fail(res, 400, 'AGENT_RUN_ID_REQUIRED', 'Agent mutations require a valid X-Agent-Run-Id header.');
    return;
  }
  const idempotencyKey = boundedHeader(req, 'idempotency-key', 200);
  if (!/^[A-Za-z0-9._:-]{8,200}$/.test(idempotencyKey)) {
    fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Agent mutations require an Idempotency-Key header of 8 to 200 safe characters.');
    return;
  }
  const model = (req.app as unknown as { db?: { models?: Record<string, any> } }).db?.models?.IdempotencyRecord;
  if (!model) {
    fail(res, 503, 'IDEMPOTENCY_UNAVAILABLE', 'Replay protection is temporarily unavailable.');
    return;
  }
  const keyHash = hash(idempotencyKey);
  const fingerprint = hash(JSON.stringify(stableValue({ method: req.method, path: req.originalUrl, body: req.body || {} })));
  const identity = { apiClientId: req.apiClient.id, keyHash };
  let record: Record<string, any>;
  let claimed = false;
  try {
    record = await model.create({
      ...identity, fingerprint, method: req.method, path: req.originalUrl,
      agentRunId: agentRun.runId, status: 'pending', requestId: req.requestId || '',
      createDate: new Date(), expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    });
    claimed = true;
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    record = await model.findOne(identity).lean();
    if (!record) throw error;
  }
  if (!claimed) {
    if (String(record.fingerprint || '') !== fingerprint) {
      fail(res, 409, 'IDEMPOTENCY_KEY_REUSED', 'This idempotency key was already used for a different request.');
      return;
    }
    if (record.status === 'completed') {
      res.setHeader('Idempotent-Replay', 'true');
      res.status(Number(record.responseStatus || 200)).json(record.responseBody ?? { success: true });
      return;
    }
    const createdAt = new Date(record.createDate || 0).getTime();
    if (Date.now() - createdAt <= PENDING_STALE_MS) {
      res.setHeader('Retry-After', '2');
      fail(res, 409, 'IDEMPOTENCY_REQUEST_PENDING', 'The original request is still being processed.');
      return;
    }
    await model.updateOne(identity, {
      $set: { fingerprint, status: 'pending', requestId: req.requestId || '', createDate: new Date(), agentRunId: agentRun.runId },
    });
  }

  let responseBody: unknown = null;
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as typeof res.json;
  res.on('finish', () => {
    void model.updateOne(identity, {
      $set: {
        status: 'completed', responseStatus: res.statusCode, responseBody,
        completedDate: new Date(), expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    }).catch((error: unknown) => console.error('Idempotency response persistence failed:', error));
  });
  next();
}
