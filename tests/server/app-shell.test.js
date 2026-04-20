'use strict';

const express = require('express');
const request = require('supertest');
const attachAppRoutes = require('../../server/src/controllers/app');
const registerLegacyPathRedirects = require('../../server/src/middlewares/routes');

describe('React shell routes', function () {
  function createApp() {
    const app = express();
    const router = express.Router();
    attachAppRoutes(router);
    app.use('/app', router);
    return app;
  }

  function createRootApp() {
    const app = express();
    registerLegacyPathRedirects(app, null);
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

  it('serves the React shell at the root route', async function () {
    const app = createRootApp();
    const res = await request(app).get('/').expect(200);

    expect(res.text).toContain('<!DOCTYPE html>');
    expect(res.text).toContain('Wikitruth - React App');
  });

  it('redirects /app alias routes to root-based modern routes', async function () {
    const app = createRootApp();
    const res = await request(app).get('/app/topics').expect(302);

    expect(res.headers.location).toBe('/topics');
  });

  it('redirects legacy /related routes to modern entry pages when query targets are present', async function () {
    const app = createRootApp();
    const res = await request(app).get('/related?topic=abc123').expect(302);

    expect(res.headers.location).toBe('/topics/entry/abc123');
  });

  it('redirects legacy verdict update routes into modern admin verdict pages', async function () {
    const app = createRootApp();
    const res = await request(app).get('/verdict/update?argument=arg001').expect(302);

    expect(res.headers.location).toBe('/admin/verdicts/arg001?argument=arg001&type=argument');
  });

  it('redirects legacy outline create flow into modern outline link flow', async function () {
    const app = createRootApp();
    const res = await request(app).get('/outline/create?topic=topic42').expect(302);

    expect(res.headers.location).toBe('/outline/link?topic=topic42&parentId=topic42&parentType=topic');
  });

  it('redirects legacy topic-link entry routes into modern topic entry routes', async function () {
    const app = createRootApp();
    const res = await request(app).get('/topic/sample-topic/link/link001').expect(302);

    expect(res.headers.location).toBe('/topics/entry/link001?topicLink=link001');
  });

  it('redirects legacy topic-link edit routes into modern topic entry routes', async function () {
    const app = createRootApp();
    const res = await request(app).get('/topics/link/edit?id=topicLink001').expect(302);

    expect(res.headers.location).toBe('/topics/entry/topicLink001?id=topicLink001&topicLink=topicLink001&mode=edit-link');
  });

  it('redirects legacy argument-link edit routes into modern argument entry routes', async function () {
    const app = createRootApp();
    const res = await request(app).get('/arguments/link/edit?id=argumentLink001').expect(302);

    expect(res.headers.location).toBe('/arguments/entry/argumentLink001?id=argumentLink001&argumentLink=argumentLink001&mode=edit-link');
  });
});
