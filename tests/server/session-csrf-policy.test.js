'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const request = require('supertest');
const config = require('../../config/config');
const { createCsrfProtection } = require('../../server/src/middlewares/csrfProtection');

/** @typedef {import('../../server/src/types/http').WikitruthRequest} WikitruthRequest */

function createSecurityTestApp(options = {}) {
  const app = express();
  const sessionCookie = config.session.cookie;
  const csrfCookie = config.csrf.cookie;

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cookieParser(config.cryptoKey));
  app.use(
    session({
      name: config.session.name,
      secret: config.cryptoKey,
      resave: config.session.resave,
      saveUninitialized: config.session.saveUninitialized,
      rolling: config.session.rolling,
      proxy: config.session.proxy,
      store: new session.MemoryStore(),
      cookie: {
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite,
        maxAge: sessionCookie.maxAgeMs,
      },
    })
  );
  app.use(
    createCsrfProtection({
      ignoreMethods: config.csrf.ignoreMethods,
      skip: options.skip,
      cookie: {
        signed: csrfCookie.signed,
        secure: csrfCookie.secure,
        sameSite: csrfCookie.sameSite,
      },
    })
  );

  app.get('/form', /** @param {WikitruthRequest} req */ function (req, res) {
    res.status(200).json({ csrfToken: req.csrfToken() });
  });

  app.post('/form', function (req, res) {
    res.status(200).json({ ok: true });
  });

  app.post('/api/home', function (req, res) {
    res.status(200).json({ ok: true, csrfToken: req.csrfToken() });
  });

  app.use(function (err, req, res, next) {
    if (err && err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return next(err);
  });

  return app;
}

describe('Session and CSRF policy', function () {
  it('rejects legacy form writes without a CSRF token', async function () {
    const app = createSecurityTestApp();

    await request(app).post('/form').type('form').send({ field: 'value' }).expect(403);
  });

  it('allows legacy form writes with a CSRF token', async function () {
    const app = createSecurityTestApp();
    const agent = request.agent(app);

    const csrfResponse = await agent.get('/form').expect(200);
    await agent
      .post('/form')
      .type('form')
      .send({ _csrf: csrfResponse.body.csrfToken, field: 'value' })
      .expect(200);
  });

  it('stores the CSRF secret in a signed, HTTP-only cookie', async function () {
    const app = createSecurityTestApp();
    const response = await request(app).get('/form').expect(200);
    const secretCookie = response.headers['set-cookie'].find((cookie) => cookie.startsWith('_csrf='));

    expect(secretCookie).toContain('s%3A');
    expect(secretCookie).toContain('HttpOnly');
    expect(secretCookie).toContain('SameSite=Lax');
  });

  it('rejects a valid token paired with another browser secret', async function () {
    const app = createSecurityTestApp();
    const firstAgent = request.agent(app);
    const secondAgent = request.agent(app);
    const firstToken = (await firstAgent.get('/form').expect(200)).body.csrfToken;

    await secondAgent.get('/form').expect(200);
    await secondAgent.post('/form').type('form').send({ _csrf: firstToken }).expect(403);
  });

  it('rejects a tampered CSRF token', async function () {
    const app = createSecurityTestApp();
    const agent = request.agent(app);
    const token = (await agent.get('/form').expect(200)).body.csrfToken;

    await agent.post('/form').type('form').send({ _csrf: token + 'tampered' }).expect(403);
  });

  it('enforces CSRF on API writes by default', async function () {
    const app = createSecurityTestApp();

    await request(app).post('/api/home').send({ hello: 'world' }).expect(403);
  });

  it('accepts API writes when a valid CSRF token is provided', async function () {
    const app = createSecurityTestApp();
    const agent = request.agent(app);

    const csrfResponse = await agent.get('/form').expect(200);
    await agent
      .post('/api/home')
      .set('CSRF-Token', csrfResponse.body.csrfToken)
      .send({ hello: 'world' })
      .expect(200);
  });

  it('accepts the modern client x-csrf-token header', async function () {
    const app = createSecurityTestApp();
    const agent = request.agent(app);
    const csrfResponse = await agent.get('/form').expect(200);

    await agent
      .post('/api/home')
      .set('x-csrf-token', csrfResponse.body.csrfToken)
      .send({ hello: 'world' })
      .expect(200);
  });

  it('initializes csrfToken while skipping an explicitly exempt write', async function () {
    const app = createSecurityTestApp({ skip: (req) => req.path === '/api/home' });
    const response = await request(app).post('/api/home').send({ hello: 'beacon' }).expect(200);

    expect(response.body.csrfToken).toEqual(expect.any(String));
  });
});
