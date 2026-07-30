import express from 'express';
import request from 'supertest';

const findUsers = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      User: {
        find: (...args: unknown[]) => findUsers(...args),
      },
    },
  },
}));

const registerAdminRoutes = require('../../server/src/controllers/api/admin');

function createApp() {
  const app = express();
  app.use((req, _res, next) => {
    req.user = {
      _id: 'admin-1',
      id: 'admin-1',
      username: 'admin',
      canPlayRoleOf: (role: string) => role === 'admin',
    };
    next();
  });
  const router = express.Router();
  registerAdminRoutes(router);
  app.use('/api/admin', router);
  return app;
}

describe('admin user responses', () => {
  it('returns management fields without credentials or provider secrets', async () => {
    findUsers.mockReturnValue({
      limit: () => ({
        lean: async () => [{
          _id: 'user-1',
          username: 'example-user',
          email: 'example@example.test',
          roles: { reviewer: true },
          password: 'stored-password-hash',
          resetPasswordToken: 'reset-token',
          mobileTokens: [{ tokenHash: 'mobile-token-hash' }],
          github: { accessToken: 'provider-access-token' },
        }],
      }),
    });

    const response = await request(createApp()).get('/api/admin/users').expect(200);

    expect(response.body).toEqual([{
      _id: 'user-1',
      username: 'example-user',
      email: 'example@example.test',
      roles: { reviewer: true },
    }]);
    expect(JSON.stringify(response.body)).not.toMatch(/password|token|provider-access-token/i);
  });
});
