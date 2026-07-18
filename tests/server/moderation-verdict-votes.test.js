'use strict';

const express = require('express');
const request = require('supertest');

const voteFindOneAndUpdate = jest.fn();
const voteFind = jest.fn();
const writeVerdictDecision = jest.fn();
const logEntryEvent = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      VerdictVote: {
        findOneAndUpdate: (...args) => voteFindOneAndUpdate(...args),
        find: (...args) => voteFind(...args),
      },
      ReaderSignal: {},
      Appeal: {},
      User: {},
    },
  },
}));
jest.mock('../../server/src/utils/flowUtils', () => ({
  createOwnerQueryFromQuery: (req) => ({ ownerType: 1, ownerId: req.query.topic }),
  getDbModelByObjectType: jest.fn(),
}));
jest.mock('../../server/src/controllers/api/verdictDecisionWriter', () => ({
  writeVerdictDecision: (...args) => writeVerdictDecision(...args),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));
jest.mock('../../server/src/services/notificationsService', () => ({
  createNotification: jest.fn(),
}));

function queryResult(value) {
  return {
    sort: () => ({ lean: async () => value }),
    lean: async () => value,
  };
}

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  const router = express.Router();
  const { registerModerationSignalsRoutes } = require('../../server/src/controllers/api/moderationSignalsRoutes');
  registerModerationSignalsRoutes(router);
  app.use('/api/moderation', router);
  return app;
}

const reviewer = {
  id: 'reviewer-1',
  username: 'reviewer',
  canPlayRoleOf: (role) => role === 'reviewer',
};

describe('channel-specific verdict votes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    voteFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: 'vote-1' }) });
    voteFind.mockReturnValue(queryResult([]));
    writeVerdictDecision.mockResolvedValue({ published: true, entry: { _id: 'topic-1' } });
  });

  it('requires reviewer access and substantive rationale', async () => {
    await request(createApp({ id: 'reader-1', canPlayRoleOf: () => false }))
      .post('/api/moderation/verdict-votes?topic=topic-1')
      .send({ channel: 'factual', channelStatus: 'supported', rationale: 'Strong evidence', confidence: 80 })
      .expect(403);

    await request(createApp(reviewer))
      .post('/api/moderation/verdict-votes?topic=topic-1')
      .send({ channel: 'factual', channelStatus: 'supported', rationale: 'short', confidence: 80 })
      .expect(400);
  });

  it('stores one vote per reviewer and channel with evidence metadata', async () => {
    const evidenceId = '507f1f77bcf86cd799439011';
    await request(createApp(reviewer))
      .post('/api/moderation/verdict-votes?topic=topic-1')
      .send({
        channel: 'ethical',
        channelStatus: 'contested',
        rationale: 'Rights and duties lead to different conclusions.',
        framework: 'human rights',
        evidenceRefs: [evidenceId, 'not-an-id'],
        confidence: 72,
        expertise: 'public policy',
      })
      .expect(200);

    expect(voteFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ objectId: 'topic-1', channel: 'ethical', voterUserId: 'reviewer-1' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          channelStatus: 'contested',
          framework: 'human rights',
          evidenceRefs: [evidenceId],
          confidence: 72,
        }),
      }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('publishes only after an eligible channel reaches policy consensus', async () => {
    voteFind.mockReturnValue(queryResult([
      { channel: 'factual', channelStatus: 'supported', confidence: 80, voterUserId: 'r1', rationale: 'Primary source one supports the claim.' },
      { channel: 'factual', channelStatus: 'supported', confidence: 75, voterUserId: 'r2', rationale: 'Primary source two supports the claim.' },
      { channel: 'factual', channelStatus: 'refuted', confidence: 90, voterUserId: 'r3', rationale: 'A source conflicts with the claim.' },
      { channel: 'factual', channelStatus: 'refuted', confidence: 100, voterUserId: 'r4', conflictDeclared: true, rationale: 'Excluded conflict.' },
    ]));

    const response = await request(createApp(reviewer))
      .post('/api/moderation/verdict-votes?topic=topic-1')
      .send({ channel: 'factual', channelStatus: 'supported', rationale: 'Primary evidence supports this factual claim.', confidence: 80 })
      .expect(200);

    expect(response.body.summary).toEqual(expect.objectContaining({
      channel: 'factual', eligibleVotes: 3, excludedConflictVotes: 1, consensusReached: true,
    }));
    expect(writeVerdictDecision).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'factual', status: 'supported', decisionMode: 'consensus',
    }));
  });
});
