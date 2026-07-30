import express from 'express';
import request from 'supertest';

const listWebSessions = jest.fn();
const revokeOtherWebSessions = jest.fn();
const revokeWebSessionById = jest.fn();

jest.mock('../../server/src/services/webSessionService', () => ({
  listWebSessions: (...args: unknown[]) => listWebSessions(...args),
  revokeOtherWebSessions: (...args: unknown[]) => revokeOtherWebSessions(...args),
  revokeWebSessionById: (...args: unknown[]) => revokeWebSessionById(...args),
}));

const { registerAuthSessionRoutes } = require('../../server/src/controllers/api/authSessionRoutes');

function createApp(authenticated = true) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = authenticated ? { _id: 'user-1', id: 'user-1', username: 'person' } : undefined;
    req.session = { webSession: { registryId: 'current' } } as never;
    next();
  });
  const router = express.Router();
  registerAuthSessionRoutes(router);
  app.use('/auth', router);
  return app;
}

describe('active web-session routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listWebSessions.mockResolvedValue([{ id: 'current', current: true }]);
    revokeWebSessionById.mockResolvedValue(true);
    revokeOtherWebSessions.mockResolvedValue(2);
  });

  it('lists sessions and protects the current session from revoke-one', async () => {
    const list = await request(createApp()).get('/auth/sessions').expect(200);
    expect(list.body.sessions).toEqual([{ id: 'current', current: true }]);

    await request(createApp()).delete('/auth/sessions/current').expect(409);
    expect(revokeWebSessionById).not.toHaveBeenCalled();
  });

  it('revokes another session or all other sessions', async () => {
    await request(createApp()).delete('/auth/sessions/other').expect(200);
    expect(revokeWebSessionById).toHaveBeenCalledWith(expect.anything(), 'other');

    const response = await request(createApp()).post('/auth/sessions/revoke-others').expect(200);
    expect(response.body.revoked).toBe(2);
  });

  it('requires a human authenticated session', async () => {
    await request(createApp(false)).get('/auth/sessions').expect(401);
  });
});
