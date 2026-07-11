'use strict';

const express = require('express');
const request = require('supertest');

const findUserById = jest.fn();
const logEntryEvent = jest.fn();
const setSessionActiveRole = jest.fn();

jest.mock('../../server/src/controllers/api/authHelpers', () => ({
  db: { User: { findById: (...args) => findUserById(...args) } },
  getDefaultActiveRole: () => 'contributor',
  getSessionActiveRole: () => 'reader',
  setSessionActiveRole: (...args) => setSessionActiveRole(...args),
  sanitizeUser: (user) => ({ _id: user._id, username: user.username, onboarding: user.onboarding }),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    req.session = { preferences: {} };
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/authOnboardingRoutes').registerAuthOnboardingRoutes(router);
  app.use('/api/auth', router);
  return app;
}

function userDocument(overrides = {}) {
  return {
    _id: 'user-1',
    username: 'alice',
    roles: {},
    onboarding: {
      contributor: { completed: false },
      reviewer: { completed: false },
    },
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('Role onboarding API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logEntryEvent.mockResolvedValue(undefined);
  });

  it('exposes tracks and reviewer eligibility', async () => {
    findUserById.mockResolvedValue(userDocument());
    const response = await request(createApp({ _id: 'user-1' }))
      .get('/api/auth/onboarding')
      .expect(200);

    expect(response.body.tracks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'contributor', eligible: true, completed: false }),
      expect.objectContaining({ key: 'reviewer', eligible: false, completed: false }),
    ]));
  });

  it('rejects incomplete contributor acknowledgements without saving', async () => {
    const user = userDocument();
    findUserById.mockResolvedValue(user);

    await request(createApp({ _id: 'user-1' }))
      .post('/api/auth/onboarding/contributor/complete')
      .send({ acknowledgements: ['search_before_creating'], confirmation: true })
      .expect(400);

    expect(user.save).not.toHaveBeenCalled();
  });

  it('requires reviewer assignment before reviewer onboarding', async () => {
    findUserById.mockResolvedValue(userDocument());
    await request(createApp({ _id: 'user-1' }))
      .post('/api/auth/onboarding/reviewer/complete')
      .send({ acknowledgements: [], confirmation: true })
      .expect(403);
  });

  it('records contributor completion, policy version, event, and active role', async () => {
    const user = userDocument();
    findUserById.mockResolvedValue(user);
    const acknowledgements = [
      'search_before_creating',
      'separate_fact_and_ethics',
      'record_source_provenance',
      'use_change_requests_for_protected_content',
    ];

    const response = await request(createApp({ _id: 'user-1' }))
      .post('/api/auth/onboarding/contributor/complete')
      .send({ acknowledgements, confirmation: true })
      .expect(200);

    expect(user.onboarding.contributor).toEqual(expect.objectContaining({
      completed: true,
      policyVersion: '2026-07-11',
      acknowledgements,
    }));
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(setSessionActiveRole).toHaveBeenCalledWith(expect.anything(), 'contributor');
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'onboarding.contributor.completed',
    }));
    expect(response.body.activeRole).toBe('contributor');
  });
});
