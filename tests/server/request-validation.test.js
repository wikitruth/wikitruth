'use strict';

require('ts-node/register/transpile-only');

const express = require('express');
const request = require('supertest');
const { validateBody, schemas } = require('../../server/src/middlewares/requestValidation');

describe('Request validation middleware', function () {
  function createApp(schema) {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.post('/write', validateBody(schema), function (req, res) {
      res.status(200).json({ ok: true });
    });

    return app;
  }

  it('rejects invalid signup payloads', async function () {
    const app = createApp(schemas.signup);

    const response = await request(app)
      .post('/write')
      .send({ username: '', email: 'bad-email', password: '' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toHaveProperty('username');
    expect(response.body.error.details).toHaveProperty('email');
    expect(response.body.error.details).toHaveProperty('recaptcha_response');
  });

  it('rejects password update payloads when confirmation mismatches', async function () {
    const app = createApp(schemas.accountPassword);

    const response = await request(app)
      .post('/write')
      .send({ newPassword: 'new-password', confirm: 'does-not-match' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts valid login payloads', async function () {
    const app = createApp(schemas.login);

    await request(app)
      .post('/write')
      .send({ username: 'valid-user', password: 'valid-password' })
      .expect(200);
  });
});
