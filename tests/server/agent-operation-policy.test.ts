import express from 'express';
import request from 'supertest';

jest.mock('../../server/src/services/civicTenantService', () => ({
  resolveCivicTenant: jest.fn(async () => ({ tenantId: 'fixtheph' })),
}));

import { enforceApiClientPolicy } from '../../server/src/middlewares/apiClientPolicy';
import { enforceApiClientScope } from '../../server/src/middlewares/apiClientScopes';
import {
  listAgentOperationPolicies,
  resolveAgentOperationPolicy,
} from '../../server/src/services/agentOperationPolicy';
import {
  API_CLIENT_SCOPES,
  normalizeApiClientPolicy,
  normalizeApiClientScopes,
} from '../../server/src/services/apiClientService';

const identity = (scopes: string[], policy: Record<string, unknown> = {}) => ({
  id: '507f1f77bcf86cd799439011',
  clientId: '1234567890abcdef12345678',
  name: 'Test agent',
  userId: '507f191e810c19729de860ea',
  tokenPrefix: 'wt_agent_test',
  scopes: normalizeApiClientScopes(scopes),
  rateLimitPerMinute: 60,
  expiresAt: null,
  policy: normalizeApiClientPolicy(policy),
});

function appFor(scopes: string[], policy: Record<string, unknown> = {}) {
  const app = express() as express.Express & { db?: unknown };
  app.db = { models: {
    Topic: { findById: () => ({ lean: async () => ({ _id: 'topic-1', createUserId: 'someone-else', screening: { status: 1 } }) }) },
    CivicRecord: { findOne: () => ({ lean: async () => ({ _id: 'civic-1', tenantId: 'fixtheph', createUserId: 'someone-else' }) }) },
  } };
  app.use(express.json());
  app.use((req, _res, next) => {
    req.apiClient = identity(scopes, policy);
    req.user = { _id: '507f191e810c19729de860ea', id: '507f191e810c19729de860ea' } as typeof req.user;
    next();
  });
  app.use(enforceApiClientScope);
  app.use(enforceApiClientPolicy);
  app.post('/topics', (_req, res) => res.status(201).json({ success: true }));
  app.post('/artifacts', (_req, res) => res.status(201).json({ success: true }));
  app.put('/moderation/verdict-channel', (_req, res) => res.json({ success: true }));
  app.post('/unknown-write', (_req, res) => res.json({ success: true }));
  app.post('/moderation/change-requests', (_req, res) => res.status(201).json({ success: true }));
  app.post('/civic/records', (_req, res) => res.status(201).json({ success: true }));
  app.put('/civic/records/:id', (_req, res) => res.json({ success: true }));
  return app;
}

describe('agent operation and credential policies', () => {
  it('maps the operation registry to narrow scopes and explicit human-only authority', () => {
    expect(resolveAgentOperationPolicy('POST', '/topics')).toEqual(expect.objectContaining({
      operationId: 'knowledge.entry.create', requiredScope: 'entries:create', agentAllowed: true,
    }));
    expect(resolveAgentOperationPolicy('HEAD', '/topics')).toEqual(expect.objectContaining({
      operationId: 'knowledge.entry.list', requiredScope: 'entries:read',
    }));
    expect(resolveAgentOperationPolicy('PUT', '/moderation/verdict-channel')).toEqual(expect.objectContaining({
      agentAllowed: false,
    }));
    expect(resolveAgentOperationPolicy('PUT', '/moderation/verdict-advice/advice-1')).toEqual(expect.objectContaining({
      operationId: 'moderation.verdict-advice.review', agentAllowed: false,
    }));
    expect(resolveAgentOperationPolicy('POST', '/unknown-write')).toBeNull();
    listAgentOperationPolicies().forEach((operation) => {
      if (operation.requiredScope) expect(API_CLIENT_SCOPES).toContain(operation.requiredScope);
    });
  });

  it('expands legacy scopes without preserving their broad authority', () => {
    expect(normalizeApiClientScopes(['contributions:write', 'civic:write', 'moderation:write'])).toEqual([
      'entries:create', 'entries:propose-edit', 'civic:read', 'civic:contribute', 'moderation:advise',
    ]);
    expect(normalizeApiClientPolicy({}).entryTypes).toEqual([
      'topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion',
    ]);
  });

  it('rejects unregistered and human-authority operations for agent credentials', async () => {
    const app = appFor(['entries:create', 'moderation:advise']);
    await request(app).post('/unknown-write').send({}).expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_OPERATION_UNSUPPORTED'));
    await request(app).put('/moderation/verdict-channel').send({}).expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('HUMAN_AUTHORITY_REQUIRED'));
  });

  it('enforces entry-type and source restrictions independently of scopes', async () => {
    const app = appFor(['entries:create'], {
      entryTypes: ['topic'], sourceRequired: true, ownContentOnly: true, maxVisibility: 'public_only',
    });
    await request(app).post('/artifacts').send({ source: 'https://example.test/source' }).expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_ENTRY_TYPE_RESTRICTED'));
    await request(app).post('/topics').send({ title: 'Unsourced' }).expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_SOURCE_REQUIRED'));
    await request(app).post('/topics').send({ title: 'Sourced', source: 'https://example.test/source' }).expect(201);
    await request(app).post('/topics')
      .set('X-Agent-Source-Manifest', JSON.stringify([{ url: 'https://example.test/evidence' }]))
      .send({ title: 'Manifest sourced' }).expect(201);
  });

  it('applies credential policy to the generic change-request target', async () => {
    const app = appFor(['entries:propose-edit'], {
      entryTypes: ['topic'], ownContentOnly: true, maxVisibility: 'public_only', sourceRequired: true,
    });
    await request(app).post('/moderation/change-requests').send({
      objectType: 1,
      objectId: 'topic-1',
      proposedChanges: { title: 'Sourced proposal', references: 'https://example.test/source' },
    }).expect(403).expect(({ body }) => expect(body.error.code).toBe('AGENT_OWNERSHIP_RESTRICTED'));
    await request(app).post('/moderation/change-requests').send({
      objectType: 999,
      objectId: 'topic-1',
      proposedChanges: { title: 'Unsupported type' },
    }).expect(400).expect(({ body }) => expect(body.error.code).toBe('AGENT_TARGET_REQUIRED'));
  });

  it('keeps civic contributions tenant-bounded and civic edits owner-bounded', async () => {
    const wrongTenant = appFor(['civic:contribute'], { tenantIds: ['another-tenant'] });
    await request(wrongTenant).post('/civic/records').send({ kind: 'incident' }).expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_TENANT_RESTRICTED'));

    const ownOnly = appFor(['civic:contribute'], { tenantIds: ['fixtheph'], ownContentOnly: true });
    await request(ownOnly).put('/civic/records/civic-1').send({ title: 'Agent edit' }).expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_OWNERSHIP_RESTRICTED'));
  });
});
