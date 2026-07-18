'use strict';

const express = require('express');
const request = require('supertest');

const writeVerdictDecision = jest.fn();
const voteFind = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      VerdictVote: { find: (...args) => voteFind(...args) },
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

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  const router = express.Router();
  const { registerModerationVerdictChannelRoutes } = require('../../server/src/controllers/api/moderationVerdictChannelRoutes');
  registerModerationVerdictChannelRoutes(router);
  app.use('/api/moderation', router);
  return app;
}

function admin() {
  return {
    id: 'admin-1',
    username: 'admin',
    canPlayRoleOf: (role) => role === 'admin',
  };
}

describe('administrator final-say verdict routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    voteFind.mockReturnValue({ lean: async () => [] });
    writeVerdictDecision.mockResolvedValue({ published: true, entry: { _id: 'topic-1' } });
  });

  it('does not allow readers or reviewers to use final say', async () => {
    await request(createApp({ id: 'reviewer-1', canPlayRoleOf: (role) => role === 'reviewer' }))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({
        channel: 'factual',
        status: 'supported',
        reasoning: 'Primary evidence supports the claim.',
        acknowledgeOverride: true,
        overrideReason: 'I am making a final decision after review.',
      })
      .expect(403);

    expect(writeVerdictDecision).not.toHaveBeenCalled();
  });

  it('requires explicit acknowledgement and a substantive reason', async () => {
    const app = createApp(admin());
    await request(app)
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({ channel: 'factual', status: 'supported', reasoning: 'Primary evidence supports the claim.' })
      .expect(400);
    await request(app)
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({
        channel: 'factual',
        status: 'supported',
        reasoning: 'Primary evidence supports the claim.',
        acknowledgeOverride: true,
        overrideReason: 'short',
      })
      .expect(400);
  });

  it('validates ethical framework before applying an override', async () => {
    await request(createApp(admin()))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({
        channel: 'ethical',
        status: 'contested',
        reasoning: 'Different duties produce different conclusions.',
        acknowledgeOverride: true,
        overrideReason: 'The panel is blocked and a final decision is required.',
      })
      .expect(400);

    expect(writeVerdictDecision).not.toHaveBeenCalled();
  });

  it('records an administrator final-say decision with the consensus snapshot', async () => {
    const response = await request(createApp(admin()))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({
        channel: 'ethical',
        status: 'contested',
        framework: 'human rights',
        reasoning: 'Different rights frameworks balance the harms differently.',
        evidenceRefs: ['507f1f77bcf86cd799439011'],
        acknowledgeOverride: true,
        overrideReason: 'The available evidence requires an accountable final decision.',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(writeVerdictDecision).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'ethical',
      status: 'contested',
      decisionMode: 'admin_override',
      overrideReason: 'The available evidence requires an accountable final decision.',
      consensusSnapshot: expect.objectContaining({ channel: 'ethical', reached: false }),
    }));
  });

  it('validates both channels before applying a dual override', async () => {
    await request(createApp(admin()))
      .put('/api/moderation/verdict-channels?topic=topic-1')
      .send({
        factual: { status: 'supported', reasoning: 'Primary evidence supports the factual claim.' },
        ethical: { status: 'contested', reasoning: 'This reasoning has no named framework.' },
        acknowledgeOverride: true,
        overrideReason: 'The administrator accepts accountability for both decisions.',
      })
      .expect(400);

    expect(writeVerdictDecision).not.toHaveBeenCalled();
  });
});
