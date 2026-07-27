import express from 'express';
import request from 'supertest';
import attachAgent from '../../server/src/controllers/api/agent';

function queryChain(rows: Array<Record<string, unknown>>) {
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    select: jest.fn(() => query),
    lean: jest.fn(async () => rows),
  };
  return query;
}

function createApp() {
  const revisionFind = jest.fn(() => queryChain([{ _id: 'revision-1', agentRunId: 'run-001' }]));
  const requestFind = jest.fn(() => queryChain([{ _id: 'request-1', agentRunId: 'run-001', status: 'completed' }]));
  const revisionCount = jest.fn(async () => 1);
  const app = express() as express.Express & { db?: unknown };
  app.db = {
    models: {
      EntryRevision: { find: revisionFind, countDocuments: revisionCount },
      IdempotencyRecord: { find: requestFind },
    },
  };
  app.use((req, _res, next) => {
    req.apiClient = {
      id: '507f1f77bcf86cd799439011', clientId: 'client-1', name: 'Research agent', userId: 'user-1',
      tokenPrefix: 'prefix', scopes: ['entries:read'], rateLimitPerMinute: 60, expiresAt: null,
    };
    req.user = { _id: 'user-1', id: 'user-1', username: 'owner' } as never;
    next();
  });
  const router = express.Router();
  attachAgent(router);
  app.use('/agent', router);
  return { app, revisionFind, requestFind };
}

describe('agent activity API', () => {
  it('filters revision activity to the calling credential and optional run', async () => {
    const { app, revisionFind } = createApp();
    const response = await request(app).get('/agent/activity?runId=run-001').expect(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true, total: 1 }));
    expect(revisionFind).toHaveBeenCalledWith({ apiClientId: '507f1f77bcf86cd799439011', agentRunId: 'run-001' });
  });

  it('reports a run using only requests and revisions owned by the credential', async () => {
    const { app, revisionFind, requestFind } = createApp();
    const response = await request(app).get('/agent/runs/run-001').expect(200);
    expect(response.body).toEqual(expect.objectContaining({ runId: 'run-001', status: 'completed' }));
    expect(requestFind).toHaveBeenCalledWith({ apiClientId: '507f1f77bcf86cd799439011', agentRunId: 'run-001' });
    expect(revisionFind).toHaveBeenCalledWith({ apiClientId: '507f1f77bcf86cd799439011', agentRunId: 'run-001' });
  });
});

