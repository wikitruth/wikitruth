'use strict';

require('ts-node/register/transpile-only');

const express = require('express');
const request = require('supertest');
const requestContext = require('../../server/src/middlewares/requestContext');
const { apiEnvelopeMiddleware } = require('../../server/src/middlewares/apiError');
const { createMobileApiContractMiddleware } = require('../../server/src/middlewares/mobileApiContracts');

describe('Mobile API contract middleware', function () {
  function createApp(options = {}) {
    const app = express();
    app.use(express.json());
    app.use(requestContext);

    const router = express.Router();
    router.use(apiEnvelopeMiddleware);
    router.use(createMobileApiContractMiddleware({
      rateLimitPerMinute: 2,
      rateLimitWindowMs: 60_000,
      deprecationSunset: '2028-12-31T23:59:59.000Z',
      deprecationPolicyUrl: 'https://wikitruth.net/docs/deprecations',
      ...options,
    }));

    router.get('/home', function (req, res) {
      res.json({ topics: [] });
    });

    router.get('/topics', function (req, res) {
      res.json({ topics: [] });
    });

    router.get('/search', function (req, res) {
      res.json({ topics: [], arguments: [] });
    });

    app.use('/api', router);
    return app;
  }

  it('adds pagination and contract headers to mobile-read endpoints', async function () {
    const app = createApp();

    const response = await request(app)
      .get('/api/search?q=test&limit=7&cursor=2026-01-01T00:00:00.000Z')
      .set('X-Client-Platform', 'android')
      .set('X-Client-Version', '2.0.0')
      .set('X-Client-Build', '200')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.pagination).toEqual({
      limit: 7,
      cursor: '2026-01-01T00:00:00.000Z',
      nextCursor: null,
    });

    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
    expect(response.headers['ratelimit-reset']).toBeDefined();
    expect(response.headers['deprecation']).toBe('false');
    expect(response.headers['sunset']).toBeDefined();
    expect(response.headers['x-api-contract']).toBe('mobile-mvp-v1');
    expect(response.headers['x-mobile-client']).toBe('android/2.0.0/200');
  });

  it('returns RATE_LIMITED when the contract rate limit is exceeded', async function () {
    const app = createApp();

    await request(app).get('/api/home').expect(200);
    await request(app).get('/api/home').expect(200);
    const limited = await request(app).get('/api/home').expect(429);

    expect(limited.body.success).toBe(false);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});
