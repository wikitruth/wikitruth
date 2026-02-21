'use strict';

const express = require('express');
const request = require('supertest');
const attachAppRoutes = require('../../controllers/app');

describe('React shell routes', function () {
  function createApp() {
    const app = express();
    const router = express.Router();
    attachAppRoutes(router);
    app.use('/app', router);
    return app;
  }

  it('serves the React shell at /app', async function () {
    const app = createApp();
    const res = await request(app).get('/app').expect(200);

    expect(res.text).toContain('<!DOCTYPE html>');
    expect(res.text).toContain('Wikitruth - React App');
  });

  it('serves the React shell for nested app routes', async function () {
    const app = createApp();
    const res = await request(app).get('/app/topic/123').expect(200);

    expect(res.text).toContain('<!DOCTYPE html>');
    expect(res.text).toContain('Wikitruth - React App');
  });
});
