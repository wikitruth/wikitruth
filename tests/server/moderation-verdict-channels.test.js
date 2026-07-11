'use strict';

const express = require('express');
const request = require('supertest');

const findEntryById = jest.fn();
const recordEntryRevision = jest.fn();
const logEntryEvent = jest.fn();

jest.mock('../../server/src/app', () => ({ db: { models: {} } }));
jest.mock('../../server/src/utils/flowUtils', () => ({
  createOwnerQueryFromQuery: (req) => ({ ownerType: 1, ownerId: req.query.topic }),
  getDbModelByObjectType: () => ({ findById: (...args) => findEntryById(...args) }),
}));
jest.mock('../../server/src/controllers/api/moderationDuplicateRoutes', () => ({ registerModerationDuplicateRoutes: jest.fn() }));
jest.mock('../../server/src/controllers/api/moderationRevisionRoutes', () => ({ registerModerationRevisionRoutes: jest.fn() }));
jest.mock('../../server/src/controllers/api/moderationArtifactRoutes', () => ({ registerModerationArtifactRoutes: jest.fn() }));
jest.mock('../../server/src/controllers/api/moderationSignalsRoutes', () => ({ registerModerationSignalsRoutes: jest.fn() }));
jest.mock('../../server/src/controllers/api/revisionWriteRecorder', () => ({
  recordEntryRevision: (...args) => recordEntryRevision(...args),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));
jest.mock('../../server/src/services/notificationsService', () => ({ notifySubscribers: jest.fn() }));

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/moderation')(router);
  app.use('/api/moderation', router);
  return app;
}

function entryDocument() {
  const entry = {
    _id: 'topic-1',
    title: 'A testable claim',
    verdict: { status: 0 },
    verdicts: {
      factual: { status: 'pending' },
      ethical: { status: 'pending' },
    },
    save: jest.fn().mockResolvedValue(undefined),
  };
  entry.toObject = () => ({ ...entry, save: undefined, toObject: undefined });
  return entry;
}

describe('Independent verdict channels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordEntryRevision.mockResolvedValue(undefined);
    logEntryEvent.mockResolvedValue(undefined);
  });

  it('requires reviewer or admin privileges', async () => {
    await request(createApp({ id: 'reader-1', canPlayRoleOf: () => false }))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({ channel: 'factual', status: 'supported', reasoning: 'Evidence supports this claim.' })
      .expect(403);
  });

  it('requires assigned reviewers to complete reviewer onboarding', async () => {
    const response = await request(createApp({
      id: 'reviewer-1',
      roles: { reviewer: true },
      onboarding: { reviewer: { completed: false } },
      canPlayRoleOf: (role) => role === 'reviewer',
    }))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({ channel: 'factual', status: 'supported', reasoning: 'Evidence supports this claim.' })
      .expect(403);

    expect(response.body.code).toBe('ONBOARDING_REQUIRED');
    expect(findEntryById).not.toHaveBeenCalled();
  });

  it('requires substantive reasoning and an ethical framework', async () => {
    const user = { id: 'reviewer-1', canPlayRoleOf: (role) => role === 'reviewer' };
    await request(createApp(user))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({ channel: 'factual', status: 'supported', reasoning: 'Too short' })
      .expect(400);

    await request(createApp(user))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({ channel: 'ethical', status: 'contested', reasoning: 'The value judgement depends on competing duties.' })
      .expect(400);

    expect(findEntryById).not.toHaveBeenCalled();
  });

  it('maps factual status to the legacy numeric verdict without changing ethics', async () => {
    const entry = entryDocument();
    findEntryById.mockResolvedValue(entry);

    const response = await request(createApp({
      id: 'reviewer-1',
      username: 'reviewer',
      canPlayRoleOf: (role) => role === 'reviewer',
    }))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({ channel: 'factual', status: 'supported', reasoning: 'Two independent primary records support the claim.' })
      .expect(200);

    expect(entry.verdict.status).toBe(1);
    expect(entry.verdicts.factual.status).toBe('supported');
    expect(entry.verdicts.ethical.status).toBe('pending');
    expect(response.body.entry.verdictChannels.factual.status).toBe('supported');
    expect(recordEntryRevision).toHaveBeenCalledWith(expect.objectContaining({ source: 'update' }));
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'moderation.verdict.factual.updated',
      scope: 'privileged',
    }));
  });

  it('updates ethics independently and records the named framework', async () => {
    const entry = entryDocument();
    entry.verdict = { status: 1, reasoning: 'Previously supported.' };
    findEntryById.mockResolvedValue(entry);

    await request(createApp({
      id: 'admin-1',
      username: 'admin',
      canPlayRoleOf: (role) => role === 'admin',
    }))
      .put('/api/moderation/verdict-channel?topic=topic-1')
      .send({
        channel: 'ethical',
        status: 'contested',
        framework: 'human rights',
        reasoning: 'The action protects one right while limiting another.',
      })
      .expect(200);

    expect(entry.verdict.status).toBe(1);
    expect(entry.verdicts.factual.status).toBe('pending');
    expect(entry.verdicts.ethical).toEqual(expect.objectContaining({
      status: 'contested',
      framework: 'human rights',
    }));
  });

  it('validates both channels before atomically saving either one', async () => {
    const entry = entryDocument();
    findEntryById.mockResolvedValue(entry);
    const user = { id: 'reviewer-1', canPlayRoleOf: (role) => role === 'reviewer' };

    await request(createApp(user))
      .put('/api/moderation/verdict-channels?topic=topic-1')
      .send({
        factual: { status: 'supported', reasoning: 'Primary evidence supports the claim.' },
        ethical: { status: 'contested', reasoning: 'This is long enough but has no framework.' },
      })
      .expect(400);

    expect(findEntryById).not.toHaveBeenCalled();
    expect(entry.save).not.toHaveBeenCalled();
  });

  it('saves both valid channels in one revision and one audit event', async () => {
    const entry = entryDocument();
    findEntryById.mockResolvedValue(entry);

    await request(createApp({
      id: 'reviewer-1',
      username: 'reviewer',
      canPlayRoleOf: (role) => role === 'reviewer',
    }))
      .put('/api/moderation/verdict-channels?topic=topic-1')
      .send({
        factual: { status: 'mixed', reasoning: 'The evidence supports only part of the claim.' },
        ethical: {
          status: 'contested',
          reasoning: 'Different rights frameworks balance the harms differently.',
          framework: 'human rights',
        },
      })
      .expect(200);

    expect(entry.save).toHaveBeenCalledTimes(1);
    expect(entry.verdicts.factual.status).toBe('mixed');
    expect(entry.verdicts.ethical.status).toBe('contested');
    expect(recordEntryRevision).toHaveBeenCalledTimes(1);
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'moderation.verdict.channels.updated',
    }));
  });
});
