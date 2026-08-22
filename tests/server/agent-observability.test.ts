import express from 'express';
import request from 'supertest';
import { observeAgentRequests, persistAgentOperationEvent } from '../../server/src/services/agentObservabilityService';

describe('agent operation observability', () => {
  it('stores bounded metadata without nested payloads or secrets', async () => {
    const create = jest.fn(async () => undefined);
    const app = express() as express.Express & { db?: unknown };
    app.db = { models: { AgentOperationEvent: { create } } };

    await persistAgentOperationEvent(app, {
      kind: 'job_failed', apiClientId: '507f1f77bcf86cd799439011', code: 'AGENT_JOB_FAILED',
      metadata: { jobId: 'job-1', secret: { token: 'do-not-store' }, labels: ['safe', { raw: 'payload' }] },
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'job_failed', code: 'AGENT_JOB_FAILED',
      metadata: { jobId: 'job-1', labels: ['safe'] },
      occurredAt: expect.any(Date), expiresAt: expect.any(Date),
    }));
    expect(JSON.stringify(create.mock.calls[0][0])).not.toContain('do-not-store');
  });

  it('records denied authenticated agent requests without the response body', async () => {
    const create = jest.fn(async () => undefined);
    const app = express() as express.Express & { db?: unknown };
    app.db = { models: { AgentOperationEvent: { create } } };
    app.use((req, _res, next) => {
      req.apiClient = {
        id: '507f1f77bcf86cd799439011', clientId: 'client-1', name: 'Agent', userId: 'user-1',
        tokenPrefix: 'wt_agent_prefix', scopes: [], policy: {
          tenantIds: [], entryTypes: [], parentRootIds: [], ownContentOnly: true,
          maxVisibility: 'public_only', sourceRequired: false, maxBatchSize: 25,
        }, status: 'active', expiresAt: null, rateLimitPerMinute: 60,
      };
      next();
    });
    app.use(observeAgentRequests);
    app.get('/api/v1/private', (_req, res) => res.status(403).json({
      success: false, error: { code: 'AGENT_SCOPE_REQUIRED', message: 'private detail' }, secret: 'not-recorded',
    }));

    await request(app).get('/api/v1/private').expect(403);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'request_denied', code: 'AGENT_SCOPE_REQUIRED', path: '/private', statusCode: 403,
    }));
    expect(JSON.stringify(create.mock.calls[0][0])).not.toMatch(/private detail|not-recorded/);
  });
});
