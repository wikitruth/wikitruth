import express from 'express';
import request from 'supertest';

import { civicCors } from '../../server/src/middlewares/civicCors';

function createApp() {
  const app = express();
  app.use(civicCors);
  app.all('*', (_req, res) => res.json({ success: true }));
  return app;
}

describe('civic headless CORS', () => {
  const originalOrigins = process.env.CIVIC_CORS_ORIGINS;

  beforeEach(() => {
    process.env.CIVIC_CORS_ORIGINS = 'https://civic.example.test, https://another.example.test:8443';
  });

  afterAll(() => {
    if (originalOrigins === undefined) delete process.env.CIVIC_CORS_ORIGINS;
    else process.env.CIVIC_CORS_ORIGINS = originalOrigins;
  });

  it('allows an exact configured origin on versioned tenant APIs', async () => {
    const response = await request(createApp())
      .get('/api/v1/tenants/fix-example/civic/tenant')
      .set('Origin', 'https://civic.example.test')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('https://civic.example.test');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers.vary).toContain('Origin');
  });

  it('answers allowed preflight requests without entering the API router', async () => {
    const response = await request(createApp())
      .options('/api/v1/tenants/fix-example/civic/records')
      .set('Origin', 'https://another.example.test:8443')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
  });

  it('does not grant cross-origin access to unlisted origins or other APIs', async () => {
    const tenantResponse = await request(createApp())
      .get('/api/v1/tenants/fix-example/civic/tenant')
      .set('Origin', 'https://unlisted.example.test')
      .expect(200);
    const otherResponse = await request(createApp())
      .get('/api/home')
      .set('Origin', 'https://civic.example.test')
      .expect(200);

    expect(tenantResponse.headers['access-control-allow-origin']).toBeUndefined();
    expect(otherResponse.headers['access-control-allow-origin']).toBeUndefined();
  });
});
