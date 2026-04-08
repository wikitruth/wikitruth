'use strict';

const express = require('express');
const request = require('supertest');
const { apiEnvelopeMiddleware, apiErrorHandler, wrapAsyncRouter } = require('../../server/src/middlewares/apiError');

describe('API error envelope', function () {
  it('returns a consistent error payload for /api routes', async function () {
    const app = express();
    const router = wrapAsyncRouter(express.Router());

    router.get('/boom', async function () {
      const error = new Error('Database unavailable');
      error.status = 503;
      error.code = 'DB_UNAVAILABLE';
      error.details = { dependency: 'mongodb' };
      throw error;
    });

    app.use('/api', apiEnvelopeMiddleware, router);
    app.use(apiErrorHandler);

    const response = await request(app).get('/api/boom').expect(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Internal server error',
        details: { dependency: 'mongodb' },
        requestId: null,
      },
    });
  });

  it('does not override non-api error handlers', async function () {
    const app = express();

    app.get('/home/error', function () {
      throw new Error('legacy path failure');
    });

    app.use(apiErrorHandler);
    app.use(function (err, req, res, next) {
      res.status(500).json({ legacy: true, message: err.message });
    });

    const response = await request(app).get('/home/error').expect(500);
    expect(response.body).toEqual({ legacy: true, message: 'legacy path failure' });
  });

  it('adds success=true to legacy successful API payloads', async function () {
    const app = express();
    const router = wrapAsyncRouter(express.Router());

    router.get('/ok', async function (req, res) {
      res.json({ topics: [] });
    });

    app.use('/api', apiEnvelopeMiddleware, router);
    app.use(apiErrorHandler);

    const response = await request(app).get('/api/ok').expect(200);
    expect(response.body).toEqual({
      success: true,
      topics: [],
    });
  });

  it('normalizes legacy API error string payloads', async function () {
    const app = express();
    const router = wrapAsyncRouter(express.Router());

    router.get('/bad', async function (req, res) {
      res.status(400).json({ error: 'Validation failed' });
    });

    app.use('/api', apiEnvelopeMiddleware, router);
    app.use(apiErrorHandler);

    const response = await request(app).get('/api/bad').expect(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Validation failed',
        details: null,
        requestId: null,
      },
    });
  });
});
