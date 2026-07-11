'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../server/src/controllers/api/authHelpers', () => ({
  isOnboardingComplete: (user) => user?.onboarding?.contributor?.completed !== false || Boolean(user?.roles?.admin),
}));

const { requireContributorOnboarding } = require('../../server/src/middlewares/onboarding');

function createApp(user) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.post('/entry', requireContributorOnboarding, (_req, res) => res.json({ success: true }));
  app.get('/entry', requireContributorOnboarding, (_req, res) => res.json({ success: true }));
  return app;
}

describe('Contributor onboarding middleware', () => {
  it('blocks authenticated entry writes until onboarding is complete', async () => {
    const response = await request(createApp({ onboarding: { contributor: { completed: false } } }))
      .post('/entry')
      .expect(403);
    expect(response.body.code).toBe('ONBOARDING_REQUIRED');
  });

  it('allows reads, completed contributors, and administrators', async () => {
    await request(createApp({ onboarding: { contributor: { completed: false } } })).get('/entry').expect(200);
    await request(createApp({ onboarding: { contributor: { completed: true } } })).post('/entry').expect(200);
    await request(createApp({ roles: { admin: 'admin-1' }, onboarding: { contributor: { completed: false } } }))
      .post('/entry')
      .expect(200);
  });
});
