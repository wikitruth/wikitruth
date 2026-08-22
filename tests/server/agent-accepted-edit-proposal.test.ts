import express from 'express';
import request from 'supertest';

const mockCreateChangeRequest = jest.fn();

jest.mock('../../server/src/services/entryRevisionService', () => ({
  createChangeRequest: (...args: unknown[]) => mockCreateChangeRequest(...args),
}));

import { routeAgentAcceptedEditProposal } from '../../server/src/middlewares/agentAcceptedEditProposal';

const entries = ['topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'];

function createApp(screeningStatus = 1) {
  const app = express() as express.Express & { db?: unknown };
  const directMutation = jest.fn((_req, res) => res.json({ success: true, directMutation: true }));
  const models = Object.fromEntries(
    ['Topic', 'Argument', 'Question', 'Answer', 'Artifact', 'Issue', 'Opinion'].map((model) => [model, {
      findById: jest.fn(() => ({ lean: async () => ({
        _id: '507f1f77bcf86cd799439012',
        createUserId: '507f191e810c19729de860ea',
        screening: { status: screeningStatus },
      }) })),
    }]),
  );
  app.db = { models };
  app.use(express.json());
  app.use((req, _res, next) => {
    req.apiClient = {
      id: '507f1f77bcf86cd799439011', clientId: '1234567890abcdef12345678', name: 'Research agent',
      userId: '507f191e810c19729de860ea', tokenPrefix: 'wt_agent_test', scopes: ['entries:propose-edit'],
      rateLimitPerMinute: 60, expiresAt: null,
      policy: { tenantIds: [], entryTypes: [], parentRootIds: [], ownContentOnly: true, maxVisibility: 'public_only', sourceRequired: false, maxBatchSize: 25 },
    };
    req.user = { _id: '507f191e810c19729de860ea', id: '507f191e810c19729de860ea', username: 'accountable-user' } as typeof req.user;
    req.agentRun = { runId: 'run-001', model: 'research-v2', provider: 'local', purpose: 'Improve accepted entries', sourceManifest: [] };
    next();
  });
  app.use(routeAgentAcceptedEditProposal);
  entries.forEach((entryType) => app.put(`/${entryType}/entry/:id`, directMutation));
  return { app, directMutation };
}

describe('accepted entry agent edit proposals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateChangeRequest.mockResolvedValue({ _id: 'change-1', status: 'open' });
  });

  it.each(entries)('routes accepted %s edits into an attributed change request', async (entryType) => {
    const { app, directMutation } = createApp(1);
    const response = await request(app)
      .put(`/${entryType}/entry/507f1f77bcf86cd799439012`)
      .set('If-Match', '"revision-current"')
      .send({ description: 'A materially clearer accepted explanation.', changeSummary: 'Clarify this accepted entry.' })
      .expect(202);
    expect(response.body).toEqual(expect.objectContaining({ proposed: true, directMutation: false }));
    expect(directMutation).not.toHaveBeenCalled();
    expect(mockCreateChangeRequest).toHaveBeenCalledWith(expect.objectContaining({
      objectId: '507f1f77bcf86cd799439012',
      expectedBaseRevisionId: 'revision-current',
      proposedChanges: expect.objectContaining({ content: 'A materially clearer accepted explanation.' }),
      apiClientId: '507f1f77bcf86cd799439011',
      agentRunId: 'run-001',
    }));
  });

  it('allows an owned pending draft to use the existing direct edit handler', async () => {
    const { app, directMutation } = createApp(0);
    await request(app).put('/topics/entry/507f1f77bcf86cd799439012').send({ title: 'Draft update' }).expect(200)
      .expect(({ body }) => expect(body.directMutation).toBe(true));
    expect(directMutation).toHaveBeenCalledTimes(1);
    expect(mockCreateChangeRequest).not.toHaveBeenCalled();
  });

  it('requires a base revision and reports stale proposals without direct mutation', async () => {
    const { app, directMutation } = createApp(1);
    await request(app).put('/topics/entry/507f1f77bcf86cd799439012').send({ title: 'No base' }).expect(428);
    mockCreateChangeRequest.mockRejectedValueOnce(new Error('Base revision is stale because the entry has a newer revision'));
    await request(app).put('/topics/entry/507f1f77bcf86cd799439012')
      .set('If-Match', 'old-revision').send({ title: 'Stale title' }).expect(409);
    expect(directMutation).not.toHaveBeenCalled();
  });
});
