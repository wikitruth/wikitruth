import express from 'express';
import request from 'supertest';
import { enforceAgentMutationReliability } from '../../server/src/middlewares/agentMutationReliability';

type StoredRecord = Record<string, unknown>;

function createApp() {
  const records: StoredRecord[] = [];
  let handlerCalls = 0;
  const model = {
    create: jest.fn(async (payload: StoredRecord) => {
      if (records.some((record) => record.apiClientId === payload.apiClientId && record.keyHash === payload.keyHash)) {
        throw Object.assign(new Error('duplicate'), { code: 11000 });
      }
      const record = { _id: `record-${records.length + 1}`, ...payload };
      records.push(record);
      return record;
    }),
    findOne: jest.fn((query: StoredRecord) => ({
      lean: async () => records.find((record) => record.apiClientId === query.apiClientId && record.keyHash === query.keyHash) || null,
    })),
    updateOne: jest.fn(async (query: StoredRecord, update: { $set?: StoredRecord }) => {
      const record = records.find((candidate) => candidate.apiClientId === query.apiClientId && candidate.keyHash === query.keyHash);
      if (record) Object.assign(record, update.$set || {});
      return { acknowledged: true };
    }),
  };
  const app = express() as express.Express & { db?: unknown };
  app.db = { models: { IdempotencyRecord: model } };
  app.use(express.json());
  app.use((req, _res, next) => {
    req.apiClient = {
      id: '507f1f77bcf86cd799439011', clientId: 'client-1', name: 'Research agent', userId: 'user-1',
      tokenPrefix: 'prefix', scopes: ['entries:create'], rateLimitPerMinute: 60, expiresAt: null,
      policy: { tenantIds: [], entryTypes: [], parentRootIds: [], ownContentOnly: true, maxVisibility: 'public_only', sourceRequired: false, maxBatchSize: 25 },
    };
    req.requestId = 'request-123';
    next();
  });
  app.use(enforceAgentMutationReliability);
  app.post('/topics', (req, res) => {
    handlerCalls += 1;
    res.status(201).json({ success: true, title: req.body.title, agentRun: req.agentRun });
  });
  return { app, records, model, handlerCalls: () => handlerCalls };
}

const headers = {
  'Idempotency-Key': 'topic-import-0001',
  'X-Agent-Run-Id': 'run-2026-07-28-001',
  'X-Agent-Model': 'research-model-v2',
  'X-Agent-Provider': 'local',
  'X-Agent-Purpose': 'Import a reviewed source set',
};

describe('agent mutation reliability', () => {
  it('requires replay and run identifiers for mutations', async () => {
    const { app } = createApp();
    await request(app).post('/topics').send({ title: 'Claim' }).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_RUN_ID_REQUIRED'));
    await request(app).post('/topics').set('X-Agent-Run-Id', 'run-001').send({ title: 'Claim' }).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED'));
  });

  it('returns the original response for an identical retry and rejects key drift', async () => {
    const { app, records, handlerCalls } = createApp();
    const body = { title: 'Auditable claim', agentMetadata: { sourceManifest: [{ artifactId: 'artifact-1', checksum: 'sha256:abc' }] } };
    const first = await request(app).post('/topics').set(headers).send(body).expect(201);
    await new Promise((resolve) => setImmediate(resolve));
    const replay = await request(app).post('/topics').set(headers).send(body).expect(201);
    expect(replay.headers['idempotent-replay']).toBe('true');
    expect(replay.body).toEqual(first.body);
    expect(handlerCalls()).toBe(1);
    expect(records[0]).toEqual(expect.objectContaining({ status: 'completed', agentRunId: 'run-2026-07-28-001' }));
    expect(first.body.agentRun).toEqual(expect.objectContaining({
      model: 'research-model-v2', provider: 'local', sourceManifest: [expect.objectContaining({ artifactId: 'artifact-1' })],
    }));

    await request(app).post('/topics').set(headers).send({ title: 'Different claim' }).expect(409)
      .expect(({ body: responseBody }) => expect(responseBody.error.code).toBe('IDEMPOTENCY_KEY_REUSED'));
  });
});
