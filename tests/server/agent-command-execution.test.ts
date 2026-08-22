import express from 'express';

const mockCreateWriters = Object.fromEntries(
  ['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion'].map((entryType) => [entryType, jest.fn(async (_req, res) => {
    res.status(201).json({ success: true, entryType });
  })]),
);
const mockUpdateWriters = Object.fromEntries(
  ['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion'].map((entryType) => [entryType, jest.fn(async (_req, res) => {
    res.json({ success: true, entryType });
  })]),
);

jest.mock('../../server/src/controllers/api/topics', () => Object.assign(jest.fn(), {
  createEntry: (...args: unknown[]) => mockCreateWriters.topic(...args),
  updateEntry: (...args: unknown[]) => mockUpdateWriters.topic(...args),
}));
jest.mock('../../server/src/controllers/api/argumentWrites', () => ({
  createArgument: (...args: unknown[]) => mockCreateWriters.argument(...args),
  updateArgument: (...args: unknown[]) => mockUpdateWriters.argument(...args),
}));
jest.mock('../../server/src/controllers/api/questions', () => Object.assign(jest.fn(), {
  createEntry: (...args: unknown[]) => mockCreateWriters.question(...args),
  updateEntry: (...args: unknown[]) => mockUpdateWriters.question(...args),
}));
jest.mock('../../server/src/controllers/api/answers', () => Object.assign(jest.fn(), {
  createEntry: (...args: unknown[]) => mockCreateWriters.answer(...args),
  updateEntry: (...args: unknown[]) => mockUpdateWriters.answer(...args),
}));
jest.mock('../../server/src/controllers/api/artifacts', () => Object.assign(jest.fn(), {
  createEntry: (...args: unknown[]) => mockCreateWriters.artifact(...args),
  updateEntry: (...args: unknown[]) => mockUpdateWriters.artifact(...args),
}));
jest.mock('../../server/src/controllers/api/issues', () => Object.assign(jest.fn(), {
  createEntry: (...args: unknown[]) => mockCreateWriters.issue(...args),
  updateEntry: (...args: unknown[]) => mockUpdateWriters.issue(...args),
}));
jest.mock('../../server/src/controllers/api/opinions', () => Object.assign(jest.fn(), {
  createEntry: (...args: unknown[]) => mockCreateWriters.opinion(...args),
  updateEntry: (...args: unknown[]) => mockUpdateWriters.opinion(...args),
}));
jest.mock('../../server/src/middlewares/apiClientPolicy', () => ({
  enforceApiClientPolicy: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../server/src/middlewares/onboarding', () => ({
  requireContributorOnboarding: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../server/src/middlewares/agentAcceptedEditProposal', () => ({
  routeAgentAcceptedEditProposal: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../server/src/services/entryMergeService', () => ({
  findDuplicateCandidatesForDraft: jest.fn(async () => []),
}));

import { executeAgentCommand, validateAgentCommandForContext } from '../../server/src/services/agentCommandExecution';
import type { AgentExecutionContext } from '../../server/src/services/agentCommandExecution';

const entryTypes = ['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion'] as const;

function context(scopes = ['entries:create', 'entries:propose-edit']): AgentExecutionContext {
  return {
    app: express(),
    apiClient: {
      id: '507f1f77bcf86cd799439011', clientId: '1234567890abcdef12345678', name: 'Research agent',
      userId: '507f191e810c19729de860ea', tokenPrefix: 'wt_agent_test', scopes,
      rateLimitPerMinute: 60, expiresAt: null,
      policy: { tenantIds: [], entryTypes: [...entryTypes], parentRootIds: [], ownContentOnly: true, maxVisibility: 'public_only', sourceRequired: false, maxBatchSize: 25 },
    },
    user: { _id: '507f191e810c19729de860ea', id: '507f191e810c19729de860ea', username: 'owner' } as AgentExecutionContext['user'],
    agentRun: { runId: 'job-run-1', model: 'research-v2', provider: 'local', purpose: 'Create reviewed drafts', sourceManifest: [] },
  };
}

describe('agent command execution', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(entryTypes)('executes %s creation through the existing writer', async (entryType) => {
    const result = await executeAgentCommand({
      commandId: `create-${entryType}`, operation: 'entry.create', entryType,
      payload: { title: `${entryType} title`, content: 'A sufficiently detailed contribution body.', ...(entryType === 'topic' ? {} : { ownerId: '507f1f77bcf86cd799439012' }) },
    }, 0, context());
    expect(result).toEqual(expect.objectContaining({ status: 'succeeded', statusCode: 201 }));
    expect(mockCreateWriters[entryType]).toHaveBeenCalledTimes(1);
  });

  it('uses the update path for a revision-matched edit and rejects missing command scope', async () => {
    const command = {
      commandId: 'edit-topic', operation: 'entry.propose_edit', entryType: 'topic',
      entryId: '507f1f77bcf86cd799439012', baseRevisionId: '507f1f77bcf86cd799439013',
      payload: { content: 'A clearer and better sourced explanation.' },
    };
    const result = await executeAgentCommand(command, 0, context());
    expect(result.status).toBe('succeeded');
    expect(mockUpdateWriters.topic).toHaveBeenCalledTimes(1);
    const denied = await validateAgentCommandForContext(command, 0, context(['entries:read']));
    expect(denied).toEqual(expect.objectContaining({ valid: false, statusCode: 403 }));
  });
});
