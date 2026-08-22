import express from 'express';

const mockExecuteAgentCommand = jest.fn();
const mockPublishRealtimeEvent = jest.fn();

jest.mock('../../server/src/services/agentCommandExecution', () => ({
  executeAgentCommand: (...args: unknown[]) => mockExecuteAgentCommand(...args),
}));
jest.mock('../../server/src/services/realtimeEvents', () => ({
  publishRealtimeEvent: (...args: unknown[]) => mockPublishRealtimeEvent(...args),
}));

import { processAgentJob, resetAgentJobSchedulerForTests } from '../../server/src/services/agentJobService';

function query<T>(value: () => T) {
  const result = {
    select: jest.fn(() => result),
    lean: jest.fn(async () => value()),
  };
  return result;
}

function createFixture(activeIndex: number | null = null) {
  const job: Record<string, any> = {
    _id: '507f1f77bcf86cd799439020', apiClientId: '507f1f77bcf86cd799439011',
    accountableUserId: '507f191e810c19729de860ea', agentRunId: 'run-1',
    status: 'queued', leaseOwner: '', leaseExpiresAt: null,
    commands: [
      { commandId: 'one', operation: 'entry.create', entryType: 'topic', payload: {} },
      { commandId: 'two', operation: 'entry.create', entryType: 'artifact', payload: {} },
    ],
    results: [], nextIndex: activeIndex === null ? 0 : activeIndex, activeIndex,
    succeededCount: 0, failedCount: 0,
  };
  const apply = (update: Record<string, any>) => {
    Object.assign(job, update.$set || {});
    Object.keys(update.$unset || {}).forEach((key) => delete job[key]);
    if (update.$push?.results) job.results.push(update.$push.results);
    Object.entries(update.$inc || {}).forEach(([key, amount]) => { job[key] = Number(job[key] || 0) + Number(amount); });
  };
  const AgentJob = {
    findOneAndUpdate: jest.fn((criteria: Record<string, any>, update: Record<string, any>) => query(() => {
      if (criteria.status === 'cancel_requested') return null;
      apply(update);
      return { ...job };
    })),
    findById: jest.fn(() => query(() => ({ status: job.status, leaseOwner: job.leaseOwner }))),
    updateOne: jest.fn(async (_criteria: Record<string, any>, update: Record<string, any>) => { apply(update); return { modifiedCount: 1 }; }),
  };
  const app = express() as express.Express & { db?: unknown };
  app.db = { models: {
    AgentJob,
    ApiClient: { findById: async () => ({
      _id: job.apiClientId, clientId: '1234567890abcdef12345678', name: 'Research agent',
      userId: job.accountableUserId, scopes: ['entries:create'], status: 'active', rateLimitPerMinute: 60,
      policy: { entryTypes: ['topic', 'artifact'] }, toObject() { return { ...this }; },
    }) },
    User: { findById: async () => ({ _id: job.accountableUserId, username: 'owner', isActive: 'yes' }) },
  } };
  return { app, job, AgentJob };
}

describe('durable agent job worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAgentJobSchedulerForTests();
    mockExecuteAgentCommand
      .mockResolvedValueOnce({ commandId: 'one', operation: 'entry.create', status: 'succeeded', statusCode: 201, response: {}, completedDate: new Date().toISOString() })
      .mockResolvedValueOnce({ commandId: 'two', operation: 'entry.create', status: 'failed', statusCode: 400, response: {}, completedDate: new Date().toISOString() });
  });

  it('persists per-item progress and completes with errors without one large transaction', async () => {
    const { app, job } = createFixture();
    await processAgentJob(app, job._id);
    expect(mockExecuteAgentCommand).toHaveBeenCalledTimes(2);
    expect(job.results).toHaveLength(2);
    expect(job).toEqual(expect.objectContaining({
      status: 'completed_with_errors', nextIndex: 2, succeededCount: 1, failedCount: 1,
    }));
    expect(mockPublishRealtimeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'agent.job.progress' }));
  });

  it('does not automatically replay an interrupted write', async () => {
    const { app, job } = createFixture(0);
    await processAgentJob(app, job._id);
    expect(job.results[0]).toEqual(expect.objectContaining({
      status: 'failed', response: expect.objectContaining({ error: expect.objectContaining({ code: 'INTERRUPTED_WRITE_REQUIRES_REVIEW' }) }),
    }));
    expect(mockExecuteAgentCommand).toHaveBeenCalledTimes(1);
  });
});
