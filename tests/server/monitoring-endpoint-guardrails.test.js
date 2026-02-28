'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('supertest');

jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../services/realtimeEvents', () => ({
  publishRealtimeEvent: jest.fn(),
}));

function createApp() {
  const app = express();
  app.use(bodyParser.json());
  const router = express.Router();
  require('../../controllers/api/monitoring')(router);
  app.use('/api/monitoring', router);
  return app;
}

describe('Monitoring endpoint guardrails', function () {
  it('accepts same-origin JSON monitoring payloads', async function () {
    const app = createApp();

    await request(app)
      .post('/api/monitoring/errors')
      .set('Host', 'example.test')
      .set('Origin', 'https://example.test')
      .set('Content-Type', 'application/json')
      .send({ type: 'error', message: 'boom' })
      .expect(202);
  });

  it('rejects cross-origin monitoring payloads', async function () {
    const app = createApp();

    await request(app)
      .post('/api/monitoring/errors')
      .set('Host', 'example.test')
      .set('Origin', 'https://evil.test')
      .set('Content-Type', 'application/json')
      .send({ type: 'error', message: 'boom' })
      .expect(403);
  });

  it('rejects non-JSON payloads', async function () {
    const app = createApp();

    await request(app)
      .post('/api/monitoring/errors')
      .set('Host', 'example.test')
      .set('Origin', 'https://example.test')
      .set('Content-Type', 'text/plain')
      .send('oops')
      .expect(415);
  });
});
