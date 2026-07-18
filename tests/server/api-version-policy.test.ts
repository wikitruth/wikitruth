import express from 'express';
import request from 'supertest';

import { apiVersionPolicy } from '../../server/src/middlewares/apiVersionPolicy';

function app() {
  const server = express();
  server.use(apiVersionPolicy);
  server.get(['/api/status', '/api/v1/status'], (_req, res) => res.json({ success: true }));
  return server;
}

describe('API version policy', () => {
  it('marks v1 as stable and unversioned routes as compatibility aliases', async () => {
    const stable = await request(app()).get('/api/v1/status').expect(200);
    expect(stable.headers['api-version']).toBe('1');
    expect(stable.headers['x-api-stability']).toBe('stable');
    const compatibility = await request(app()).get('/api/status').expect(200);
    expect(compatibility.headers['x-api-stability']).toBe('compatibility');
  });

  it('fails closed with an agent-safe envelope for unsupported versions', async () => {
    const response = await request(app()).get('/api/v1/status').set('Accept-Version', '2').expect(406);
    expect(response.body).toEqual({
      success: false,
      error: expect.objectContaining({ code: 'UNSUPPORTED_API_VERSION', details: { requestedVersion: '2', supportedVersions: ['1'] } }),
    });
  });
});
