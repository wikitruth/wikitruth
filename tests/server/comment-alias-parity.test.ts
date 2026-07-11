import express from 'express';
import request from 'supertest';
import registerLegacyPathRedirects from '../../server/src/middlewares/routes';

describe('comment route parity aliases', () => {
  it('redirects a singular legacy comment entry to the modern opinion route', async () => {
    const app = express();
    registerLegacyPathRedirects(app, null);

    const response = await request(app)
      .get('/comment/sample-comment/comment001')
      .expect(302);

    expect(response.headers.location).toBe('/opinions/entry/sample-comment/comment001');
  });
});
