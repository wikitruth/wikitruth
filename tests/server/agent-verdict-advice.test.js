'use strict';

const express = require('express');
const request = require('supertest');

const adviceCreate = jest.fn();
const adviceFind = jest.fn();
const adviceFindById = jest.fn();
const adviceFindOneAndUpdate = jest.fn();
const adviceUpdateOne = jest.fn();
const voteFindOneAndUpdate = jest.fn();
const voteFind = jest.fn();
const ensureCurrentRevision = jest.fn();
const logEntryEvent = jest.fn();
const publishRealtimeEvent = jest.fn();
const queueKnowledgeReviewTask = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      VerdictAdvice: {
        create: (...args) => adviceCreate(...args),
        find: (...args) => adviceFind(...args),
        findById: (...args) => adviceFindById(...args),
        findOneAndUpdate: (...args) => adviceFindOneAndUpdate(...args),
        updateOne: (...args) => adviceUpdateOne(...args),
      },
      VerdictVote: {
        findOneAndUpdate: (...args) => voteFindOneAndUpdate(...args),
        find: (...args) => voteFind(...args),
      },
      ReaderSignal: {}, Appeal: {}, KnowledgeReviewTask: {},
      User: { find: () => ({ select: () => ({ lean: async () => [] }) }) },
    },
  },
}));
jest.mock('../../server/src/utils/flowUtils', () => ({
  createOwnerQueryFromQuery: () => ({}),
  getDbModelByObjectType: jest.fn(),
}));
jest.mock('../../server/src/services/entryRevisionService', () => ({
  ensureCurrentRevision: (...args) => ensureCurrentRevision(...args),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));
jest.mock('../../server/src/services/realtimeEvents', () => ({
  publishRealtimeEvent: (...args) => publishRealtimeEvent(...args),
}));
jest.mock('../../server/src/services/notificationsService', () => ({ createNotification: jest.fn() }));
jest.mock('../../server/src/services/knowledgeReviewTaskService', () => ({
  queueKnowledgeReviewTask: (...args) => queueKnowledgeReviewTask(...args),
}));
jest.mock('../../server/src/controllers/api/verdictDecisionWriter', () => ({
  writeVerdictDecision: jest.fn(async () => ({ published: false })),
}));

function lean(value) {
  return { lean: async () => value };
}

function list(value) {
  return { sort: () => ({ limit: () => ({ lean: async () => value }) }), lean: async () => value };
}

const reviewer = {
  _id: 'reviewer-1', id: 'reviewer-1', username: 'reviewer',
  canPlayRoleOf: (role) => role === 'reviewer',
};

const pendingAdvice = {
  _id: 'advice-1', objectType: 1, objectName: 'topic', objectId: 'topic-1',
  baseRevisionId: 'revision-1', channel: 'factual', channelStatus: 'supported',
  rationale: 'Multiple primary sources support this factual conclusion.',
  framework: '', evidenceRefs: [], confidence: 82, policyVersion: '2026-07-v3-standard',
  status: 'pending',
};

function createApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = options.user || reviewer;
    if (options.agent) {
      req.apiClient = { id: 'agent-1', name: 'Research agent', scopes: ['moderation:advise'] };
      req.agentRun = { runId: 'run-1', model: 'research-v2', provider: 'local', purpose: 'Review evidence', sourceManifest: [] };
    }
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/moderationSignalsRoutes').registerModerationSignalsRoutes(router);
  app.use('/api/moderation', router);
  return app;
}

describe('agent verdict advice and human countersign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureCurrentRevision.mockResolvedValue({ _id: 'revision-1', revisionNumber: 4, snapshotHash: 'hash-1' });
    adviceCreate.mockImplementation(async (payload) => ({ _id: 'advice-1', ...payload }));
    adviceFind.mockReturnValue(list([]));
    adviceFindById.mockReturnValue(lean({ ...pendingAdvice }));
    adviceFindOneAndUpdate.mockImplementation((_query, update) => lean({
      ...pendingAdvice, ...update.$set, _id: 'advice-1',
    }));
    adviceUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    voteFindOneAndUpdate.mockReturnValue(lean({ _id: 'vote-1' }));
    voteFind.mockReturnValue(lean([]));
    queueKnowledgeReviewTask.mockResolvedValue({ _id: 'task-1' });
  });

  it('stores attributed advice without creating an eligible vote', async () => {
    const response = await request(createApp({ agent: true }))
      .post('/api/moderation/verdict-advice')
      .set('If-Match', 'revision-1')
      .send({
        type: 1, id: 'topic-1', channel: 'factual', channelStatus: 'supported',
        rationale: 'Multiple primary sources support this factual conclusion.', confidence: 82,
      })
      .expect(201);
    expect(response.body).toEqual(expect.objectContaining({ advisory: true, eligibleVoteCreated: false }));
    expect(adviceCreate).toHaveBeenCalledWith(expect.objectContaining({
      baseRevisionId: 'revision-1', apiClientId: 'agent-1', agentRunId: 'run-1', status: 'pending',
    }));
    expect(voteFindOneAndUpdate).not.toHaveBeenCalled();
    expect(publishRealtimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'agent.verdict.advice_created',
    }));
  });

  it('never allows an agent credential to submit or countersign an eligible vote', async () => {
    await request(createApp({ agent: true })).post('/api/moderation/verdict-votes')
      .send({ type: 1, id: 'topic-1' }).expect(403);
    await request(createApp({ agent: true })).put('/api/moderation/verdict-advice/advice-1')
      .send({ action: 'countersign', decisionNote: 'Reviewed by a person.' }).expect(403);
    expect(voteFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('creates one human vote only after a current advice record is countersigned', async () => {
    const response = await request(createApp()).put('/api/moderation/verdict-advice/advice-1')
      .send({ action: 'countersign', decisionNote: 'I reviewed and adopt this analysis.' }).expect(200);
    expect(response.body.eligibleVoteCreated).toBe(true);
    expect(voteFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ voterUserId: 'reviewer-1', channel: 'factual' }),
      expect.objectContaining({ $set: expect.objectContaining({ sourceAdviceId: 'advice-1' }) }),
      expect.objectContaining({ upsert: true }),
    );
    expect(adviceFindOneAndUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'reviewing' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'countersigned', resultingVoteId: 'vote-1' }) }),
      { new: true },
    );
  });

  it('marks stale or rejected advice without creating a vote', async () => {
    ensureCurrentRevision.mockResolvedValueOnce({ _id: 'revision-2' });
    await request(createApp()).put('/api/moderation/verdict-advice/advice-1')
      .send({ action: 'countersign', decisionNote: 'Reviewed but stale.' }).expect(409);
    expect(adviceUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'stale' }) }),
    );
    await request(createApp()).put('/api/moderation/verdict-advice/advice-1')
      .send({ action: 'reject', decisionNote: 'Evidence is insufficient.' }).expect(200);
    expect(voteFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
