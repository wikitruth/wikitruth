'use strict';

require('ts-node/register/transpile-only');

const express = require('express');
const request = require('supertest');
const requestContext = require('../../middlewares/requestContext');
const { apiErrorHandler, wrapAsyncRouter } = require('../../middlewares/apiError');

describe('Request context middleware', function () {
  it('generates and propagates request id when header is missing', async function () {
    const app = express();
    app.use(requestContext);

    app.get('/api/home', function (req, res) {
      res.status(200).json({ requestId: req.requestId });
    });

    const response = await request(app).get('/api/home').expect(200);

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('preserves incoming request id and surfaces it in API error envelope', async function () {
    const app = express();
    const router = wrapAsyncRouter(express.Router());

    app.use(requestContext);

    router.get('/boom', async function () {
      throw new Error('forced failure');
    });

    app.use('/api', router);
    app.use(apiErrorHandler);

    const response = await request(app)
      .get('/api/boom')
      .set('X-Request-Id', 'req-fixed-12345')
      .expect(500);

    expect(response.headers['x-request-id']).toBe('req-fixed-12345');
    expect(response.body.error.requestId).toBe('req-fixed-12345');
  });

  it('captures mobile client observability tags from headers', async function () {
    const app = express();
    app.use(requestContext);

    app.get('/api/home', function (req, res) {
      res.status(200).json({ telemetry: req.clientTelemetry });
    });

    const response = await request(app)
      .get('/api/home')
      .set('X-Client-Platform', 'ios')
      .set('X-Client-Version', '1.2.3')
      .set('X-Client-Build', '456')
      .expect(200);

    expect(response.body.telemetry).toEqual({
      platform: 'ios',
      version: '1.2.3',
      build: '456',
    });
  });
});
