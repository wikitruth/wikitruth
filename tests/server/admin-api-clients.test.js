'use strict';

const express = require('express');
const request = require('supertest');

const createClient = jest.fn();
const findClientById = jest.fn();
const updateClient = jest.fn();
const audit = jest.fn();
const aggregateRateBuckets = jest.fn();
const aggregateEvents = jest.fn();
const aggregateJobs = jest.fn();
const aggregateAdvice = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      ApiClient: {
        create: (...args) => createClient(...args),
        find: () => ({ sort: () => ({ populate: () => ({ lean: async () => [] }) }) }),
        findById: (...args) => findClientById(...args),
        findByIdAndUpdate: (...args) => updateClient(...args),
      },
      ApiClientRateBucket: { aggregate: (...args) => aggregateRateBuckets(...args) },
      AgentOperationEvent: { aggregate: (...args) => aggregateEvents(...args) },
      AgentJob: { aggregate: (...args) => aggregateJobs(...args) },
      VerdictAdvice: { aggregate: (...args) => aggregateAdvice(...args) },
      User: { findById: () => ({ lean: async () => ({ _id: 'user-1', username: 'owner', isActive: 'yes' }) }) },
    },
  },
}));
jest.mock('../../server/src/services/entryEventsService', () => ({ logEntryEvent: (...args) => audit(...args) }));

function app(options = {}) {
  const server = express();
  server.use(express.json());
  server.use((req, _res, next) => {
    req.user = { _id: 'admin-1', id: 'admin-1', username: 'admin' };
    if (options.agent) req.apiClient = { id: 'agent-1' };
    next();
  });
  const router = express.Router();
  const { registerAdminApiClientRoutes } = require('../../server/src/controllers/api/adminApiClientRoutes');
  registerAdminApiClientRoutes(router, () => true);
  server.use('/api/admin', router);
  return server;
}

describe('administrator API client lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createClient.mockImplementation(async (payload) => ({
      _id: 'client-object-1', ...payload, toObject() { return { _id: this._id, ...payload }; },
    }));
    findClientById.mockReturnValue({ lean: async () => ({
      _id: 'client-object-1', clientId: '1234567890abcdef12345678', name: 'Research agent',
    }) });
    aggregateRateBuckets.mockResolvedValue([{ requests: 42, rateLimitedRequests: 3, peakRequestsPerMinute: 18, activeMinutes: 8 }]);
    aggregateEvents.mockResolvedValue([{ _id: 'request_denied', count: 2 }, { _id: 'idempotent_replay', count: 1 }]);
    aggregateJobs.mockResolvedValue([{ _id: 'completed', count: 4 }]);
    aggregateAdvice.mockResolvedValue([{ _id: 'countersigned', count: 1 }, { _id: 'rejected', count: 2 }]);
    updateClient.mockReturnValue({ lean: async () => ({
      _id: 'client-object-1', clientId: '1234567890abcdef12345678', name: 'Agent', userId: 'user-1',
      tokenPrefix: 'wt_agent_prefix', scopes: ['entries:read'], status: 'revoked', rateLimitPerMinute: 60,
    }) });
  });

  it('returns a raw token once while persisting only its hash', async () => {
    const response = await request(app())
      .post('/api/admin/api-clients')
      .send({ name: 'Research agent', userId: 'user-1', scopes: ['entries:read', 'admin:write'], rateLimitPerMinute: 60 })
      .expect(201);
    expect(response.body.token).toMatch(/^wt_agent_[a-f\d]{24}\./);
    expect(response.body.tokenReturnedOnce).toBe(true);
    const stored = createClient.mock.calls[0][0];
    expect(stored.secretHash).toMatch(/^[a-f\d]{64}$/);
    expect(stored).not.toHaveProperty('token');
    expect(stored.scopes).toEqual(['entries:read']);
    expect(stored.policy).toEqual(expect.objectContaining({ ownContentOnly: true, maxVisibility: 'public_only' }));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'agent.credential.created' }));
  });

  it('revokes a credential and audits the lifecycle event', async () => {
    await request(app()).delete('/api/admin/api-clients/client-object-1').expect(200);
    expect(updateClient).toHaveBeenCalledWith('client-object-1', expect.objectContaining({
      $set: expect.objectContaining({ status: 'revoked' }),
    }), { new: true });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'agent.credential.revoked' }));
  });

  it('never lets an agent credential manage credentials', async () => {
    await request(app({ agent: true })).get('/api/admin/api-clients').expect(403);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('reports privacy-safe usage aggregates to administrators', async () => {
    const response = await request(app()).get('/api/admin/api-clients/client-object-1/usage?days=7').expect(200);
    expect(response.body).toEqual(expect.objectContaining({
      client: { id: 'client-object-1', name: 'Research agent' },
      period: expect.objectContaining({ days: 7 }),
      usage: { requests: 42, rateLimitedRequests: 3, peakRequestsPerMinute: 18, activeMinutes: 8 },
      events: { request_denied: 2, idempotent_replay: 1 },
      jobs: { completed: 4 },
      advice: { countersigned: 1, rejected: 2 },
    }));
    expect(aggregateEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ $match: expect.objectContaining({ apiClientId: 'client-object-1' }) }),
    ]));
    expect(JSON.stringify(response.body)).not.toMatch(/token|secret|sourceManifest|requestBody/i);
  });
});
