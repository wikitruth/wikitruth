'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csrf = require('csurf');
const request = require('supertest');
const config = require('../../config/config');

/** @typedef {import('../../server/src/types/http').WikitruthRequest} WikitruthRequest */

function createSecurityTestApp() {
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
    csrf({
      ignoreMethods: config.csrf.ignoreMethods,
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
    res.status(200).json({ ok: true });
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
});
