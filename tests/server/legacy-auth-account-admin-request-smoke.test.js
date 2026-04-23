'use strict';

const path = require('path');
const express = require('express');
const request = require('supertest');

require('ts-node/register/transpile-only');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function makeProxy() {
  const target = function () {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'toString') return () => '';
      return makeProxy();
    },
    apply() {
      return makeProxy();
    },
    construct() {
      return makeProxy();
    },
  });
}

function buildStubApp() {
  return {
    db: { models: makeProxy() },
    config: makeProxy(),
    utility: {
      workflow: () => ({
        on: () => {},
        emit: () => {},
        hasErrors: () => false,
        outcome: { errors: [], errfor: {} },
      }),
    },
  };
}

describe('Legacy auth/account/admin request smoke', function () {
  let app;

  beforeAll(function () {
    process.chdir(PROJECT_ROOT);
    globalThis.__wikitruth_app = buildStubApp();

    const bootstrapId = require.resolve(path.join(PROJECT_ROOT, 'legacy', 'compatibility', 'server', 'bootstrap'));
    delete require.cache[bootstrapId];
    const registerLegacyCompatibility = require(bootstrapId);

    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    registerLegacyCompatibility(app, { enabled: true });
  });

  afterAll(function () {
    delete globalThis.__wikitruth_app;
  });

  it('serves auth routes through mounted /legacy namespace', async function () {
    const loginGetResponse = await request(app).get('/legacy/login');
    expect(loginGetResponse.status).not.toBe(404);
    expect(loginGetResponse.status).not.toBe(405);

    const loginPostResponse = await request(app).post('/legacy/login').send({ username: 'demo', password: 'demo' });
    expect(loginPostResponse.status).not.toBe(404);
    expect(loginPostResponse.status).not.toBe(405);

    const signupGetResponse = await request(app).get('/legacy/signup');
    expect(signupGetResponse.status).not.toBe(404);
    expect(signupGetResponse.status).not.toBe(405);

    const logoutGetResponse = await request(app).get('/legacy/logout');
    expect(logoutGetResponse.status).not.toBe(404);
    expect(logoutGetResponse.status).not.toBe(405);

    const contactGetResponse = await request(app).get('/legacy/contact');
    expect(contactGetResponse.status).not.toBe(404);
    expect(contactGetResponse.status).not.toBe(405);
  });

  it('keeps account/admin legacy aliases reachable and correctly redirected', async function () {
    const settingsResponse = await request(app).get('/legacy/alice/settings?tab=security').expect(302);
    expect(settingsResponse.headers.location).toBe('/legacy/members/alice/settings?tab=security');

    const adminResponse = await request(app).get('/legacy/admin?section=backup').expect(302);
    expect(adminResponse.headers.location).toBe('/legacy/admin/db-backup?section=backup');
  });
});
