'use strict';

const express = require('express');
const request = require('supertest');

const validateAgentCommandForContext = jest.fn();
const scheduleAgentJob = jest.fn();
const resumeAgentJobs = jest.fn();
const jobCreate = jest.fn();
const jobFind = jest.fn();
const jobFindOne = jest.fn();
const jobUpdateOne = jest.fn();

jest.mock('../../server/src/services/agentRuntimeServices', () => ({
  validateAgentCommandForContext: (...args) => validateAgentCommandForContext(...args),
  scheduleAgentJob: (...args) => scheduleAgentJob(...args),
  resumeAgentJobs: (...args) => resumeAgentJobs(...args),
  findDuplicateCandidatesForDraft: jest.fn(async () => []),
}));

function query(value) {
  const result = {
    sort: () => result,
    limit: () => result,
    select: () => result,
    lean: async () => value,
  };
  return result;
}

function createApp() {
  const app = express();
  app.db = { models: {
    AgentJob: {
      create: (...args) => jobCreate(...args),
      find: (...args) => jobFind(...args),
      findOne: (...args) => jobFindOne(...args),
      updateOne: (...args) => jobUpdateOne(...args),
    },
  } };
  app.use(express.json());
  app.use((req, _res, next) => {
    req.apiClient = {
      id: '507f1f77bcf86cd799439011', clientId: '1234567890abcdef12345678', name: 'Research agent',
      userId: '507f191e810c19729de860ea', scopes: ['entries:create', 'agent:runs:read'],
      policy: { maxBatchSize: 2 },
    };
    req.user = { _id: '507f191e810c19729de860ea', username: 'owner' };
    req.agentRun = { runId: 'run-1', model: 'research-v2', provider: 'local', purpose: 'Batch import', sourceManifest: [] };
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/agent')(router);
  app.use('/api/agent', router);
  return app;
}

describe('agent job API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateAgentCommandForContext.mockImplementation(async (command) => ({ valid: true, command, errors: [], warnings: [], duplicates: [] }));
    jobCreate.mockImplementation(async (payload) => ({ _id: '507f1f77bcf86cd799439020', ...payload }));
    jobFind.mockReturnValue(query([{ _id: '507f1f77bcf86cd799439020', status: 'completed' }]));
    jobFindOne.mockReturnValue(query({ _id: '507f1f77bcf86cd799439020', status: 'running' }));
    jobUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    resumeAgentJobs.mockResolvedValue(0);
  });

  it('validates and queues a bounded durable job', async () => {
    const response = await request(createApp()).post('/api/agent/jobs').send({ commands: [{
      commandId: 'create-topic', operation: 'entry.create', entryType: 'topic',
      payload: { title: 'Topic title', content: 'A detailed content body.' },
    }] }).expect(202);
    expect(response.body.job).toEqual(expect.objectContaining({ status: 'queued', commandCount: 1, agentRunId: 'run-1' }));
    expect(jobCreate).toHaveBeenCalledWith(expect.objectContaining({
      apiClientId: '507f1f77bcf86cd799439011', status: 'queued', agentRunId: 'run-1',
    }));
    expect(scheduleAgentJob).toHaveBeenCalledWith(expect.anything(), '507f1f77bcf86cd799439020');
  });

  it('rejects oversized or duplicate command batches', async () => {
    await request(createApp()).post('/api/agent/jobs').send({ commands: [{}, {}, {}] }).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_BATCH_SIZE_INVALID'));
    const command = { commandId: 'same', operation: 'entry.create', entryType: 'topic', payload: {} };
    await request(createApp()).post('/api/agent/jobs').send({ commands: [command, command] }).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('AGENT_JOB_INVALID'));
  });

  it('uses opaque collection cursors and supports cooperative cancellation', async () => {
    await request(createApp()).get('/api/agent/jobs?cursor=bad').expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('CURSOR_INVALID'));
    const listResponse = await request(createApp()).get('/api/agent/jobs?limit=25').expect(200);
    expect(listResponse.body.items).toHaveLength(1);
    const cancelResponse = await request(createApp()).post('/api/agent/jobs/507f1f77bcf86cd799439020/cancel').expect(202);
    expect(cancelResponse.body.job.status).toBe('cancel_requested');
    expect(jobUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'running' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'cancel_requested' }) }),
    );
  });
});
