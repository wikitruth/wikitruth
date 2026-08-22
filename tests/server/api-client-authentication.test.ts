import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createCsrfProtection } from '../../server/src/middlewares/csrfProtection';
import {
  authenticateApiClient,
  resetApiClientRateWindowsForTests,
} from '../../server/src/middlewares/apiClientAuthentication';
import { flushApiClientUsageForTests } from '../../server/src/services/agentUsageService';
import { enforceApiClientScope } from '../../server/src/middlewares/apiClientScopes';
import attachAgent from '../../server/src/controllers/api/agent';
import {
  apiClientSecretsMatch,
  generateApiClientToken,
  normalizeApiClientScopes,
  parseApiClientToken,
} from '../../server/src/services/apiClientService';

function credentialFixture(scopes: string[], options: { status?: string; expiresAt?: Date; rate?: number } = {}) {
  const credential = generateApiClientToken('1234567890abcdef12345678');
  const client = {
    _id: '507f1f77bcf86cd799439011',
    clientId: credential.clientId,
    name: 'Research agent',
    userId: '507f191e810c19729de860ea',
    tokenPrefix: credential.tokenPrefix,
    secretHash: credential.secretHash,
    scopes,
    status: options.status || 'active',
    expiresAt: options.expiresAt || null,
    rateLimitPerMinute: options.rate || 60,
    toObject() { return { ...this }; },
  };
  return { credential, client };
}

function createApp(fixture: ReturnType<typeof credentialFixture>, rateCounts = new Map<string, number>()) {
  const app = express() as express.Express & { db?: unknown };
  const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
  const user = {
    _id: fixture.client.userId,
    id: fixture.client.userId,
    username: 'accountable-user',
    isActive: 'yes',
    onboarding: { contributor: { completed: true } },
    roles: {},
    canPlayRoleOf: () => false,
    defaultReturnUrl: () => '/',
    isAdmin: () => false,
  };
  app.db = {
    models: {
      ApiClient: {
        findOne: () => ({ select: async () => fixture.client }),
        updateOne,
      },
      ApiClientRateBucket: {
        findOneAndUpdate: (filter: { apiClientId: string; windowStart: Date }) => {
          const key = `${filter.apiClientId}:${filter.windowStart.toISOString()}`;
          const count = (rateCounts.get(key) || 0) + 1;
          rateCounts.set(key, count);
          return Promise.resolve({ ...filter, count });
        },
      },
      User: { findById: async () => user },
    },
  };
  app.use(express.json());
  app.use(cookieParser('test-secret'));
  app.use(authenticateApiClient);
  app.use(createCsrfProtection({ skip: (req) => Boolean(req.apiClient), cookie: { signed: true } }));
  const apiRouter = express.Router();
  apiRouter.use(enforceApiClientScope);
  const agentRouter = express.Router();
  attachAgent(agentRouter);
  apiRouter.use('/agent', agentRouter);
  apiRouter.post('/topics', (req, res) => res.status(201).json({
    success: true,
    actor: req.user?.username,
    apiClient: req.apiClient?.name,
    screening: { status: 0 },
  }));
  apiRouter.get('/topics', (_req, res) => res.json({ success: true }));
  apiRouter.put('/moderation/verdict-channel', (_req, res) => res.json({ success: true }));
  app.use('/api/v1', apiRouter);
  return { app, updateOne };
}

describe('scoped API client authentication', () => {
  beforeEach(() => resetApiClientRateWindowsForTests());

  it('generates parseable tokens and compares only hashed secrets', () => {
    const credential = generateApiClientToken('1234567890abcdef12345678');
    const parsed = parseApiClientToken(credential.token);
    expect(parsed?.clientId).toBe(credential.clientId);
    expect(apiClientSecretsMatch(credential.secretHash, parsed?.secret || '')).toBe(true);
    expect(apiClientSecretsMatch(credential.secretHash, 'wrong-secret-value-that-is-long-enough')).toBe(false);
    expect(normalizeApiClientScopes(['entries:read', 'admin:write'])).toEqual(['entries:read']);
  });

  it('authenticates before CSRF and attributes a pending standard contribution', async () => {
    const fixture = credentialFixture(['entries:create']);
    const { app, updateOne } = createApp(fixture);
    const response = await request(app)
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${fixture.credential.token}`)
      .send({ title: 'Agent contribution' })
      .expect(201);
    expect(response.body).toEqual(expect.objectContaining({
      actor: 'accountable-user', apiClient: 'Research agent', screening: { status: 0 },
    }));
    await flushApiClientUsageForTests();
    expect(updateOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ $inc: { requestCount: 1 } }));
  });

  it('rejects missing scopes and invalid or expired credentials', async () => {
    const readOnly = credentialFixture(['entries:read']);
    await request(createApp(readOnly).app)
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${readOnly.credential.token}`)
      .send({})
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_SCOPE_REQUIRED'));

    const expired = credentialFixture(['entries:create'], { expiresAt: new Date(Date.now() - 1000) });
    await request(createApp(expired).app)
      .post('/api/v1/topics')
      .set('Authorization', `Bearer ${expired.credential.token}`)
      .send({})
      .expect(401)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_TOKEN_EXPIRED'));

    const revoked = credentialFixture(['entries:read'], { status: 'revoked' });
    await request(createApp(revoked).app)
      .get('/api/v1/topics')
      .set('Authorization', `Bearer ${revoked.credential.token}`)
      .expect(401);
  });

  it('publishes identity and bounded capabilities without exposing the secret hash', async () => {
    const fixture = credentialFixture(['entries:read', 'entries:create', 'graph:write']);
    const response = await request(createApp(fixture).app)
      .get('/api/v1/agent/capabilities')
      .set('Authorization', `Bearer ${fixture.credential.token}`)
      .expect(200);
    expect(response.body.contributionContract).toEqual(expect.objectContaining({
      screening: 'pending', automaticVerdict: false, attribution: 'api_client_accountable_user_and_agent_run',
    }));
    expect(JSON.stringify(response.body)).not.toContain('secretHash');
    expect(response.body.endpoints.create).toContain('/api/v1/artifacts');
    expect(response.body.endpoints.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ operationId: 'knowledge.entry.create', requiredScope: 'entries:create' }),
    ]));
  });

  it('observes credential revocation immediately despite the short-lived cache', async () => {
    const fixture = credentialFixture(['entries:read']);
    const { app } = createApp(fixture);
    await request(app).get('/api/v1/topics')
      .set('Authorization', `Bearer ${fixture.credential.token}`).expect(200);
    fixture.client.status = 'revoked';
    (fixture.client as typeof fixture.client & { editDate?: Date }).editDate = new Date();
    await request(app).get('/api/v1/topics')
      .set('Authorization', `Bearer ${fixture.credential.token}`).expect(401)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_TOKEN_INVALID'));
  });

  it('validates graph contributions without mutation or final-decision authority', async () => {
    const fixture = credentialFixture(['graph:write']);
    const response = await request(createApp(fixture).app)
      .post('/api/v1/agent/validate')
      .set('Authorization', `Bearer ${fixture.credential.token}`)
      .set('X-Agent-Run-Id', 'dry-run-001')
      .send({ operation: 'graph_link', payload: { parentId: 'topic-1', targetId: 'artifact-1', relationship: 'supports' } })
      .expect(200);
    expect(response.body).toEqual(expect.objectContaining({
      dryRun: true, valid: true, operation: 'graph_link', automaticFinalDecision: false,
    }));
  });

  it('does not let moderation-scoped agents publish a final verdict', async () => {
    const fixture = credentialFixture(['moderation:advise']);
    await request(createApp(fixture).app)
      .put('/api/v1/moderation/verdict-channel')
      .set('Authorization', `Bearer ${fixture.credential.token}`)
      .send({ status: 'supported' })
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('HUMAN_AUTHORITY_REQUIRED'));
  });

  it('enforces one durable rate limit across application processes', async () => {
    const fixture = credentialFixture(['entries:read'], { rate: 10 });
    const sharedRateCounts = new Map<string, number>();
    const firstProcess = createApp(fixture, sharedRateCounts).app;
    const secondProcess = createApp(fixture, sharedRateCounts).app;
    for (let index = 0; index < 10; index += 1) {
      const app = index % 2 === 0 ? firstProcess : secondProcess;
      await request(app).get('/api/v1/topics').set('Authorization', `Bearer ${fixture.credential.token}`).expect(200);
    }
    await request(secondProcess)
      .get('/api/v1/topics')
      .set('Authorization', `Bearer ${fixture.credential.token}`)
      .expect(429)
      .expect('Retry-After', /\d+/);
  });
});
