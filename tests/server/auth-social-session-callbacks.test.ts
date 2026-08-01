import express from 'express';
import fs from 'fs';
import path from 'path';
import session from 'express-session';
import request from 'supertest';

jest.mock('../../server/src/app', () => ({
  db: {
    models: {},
  },
}));

const registerAuthRoutes = require('../../server/src/controllers/api/auth');

function createUser() {
  return {
    _id: 'user-1',
    id: 'user-1',
    username: 'demo',
    email: 'demo@example.com',
    roles: {
      screener: true,
      reviewer: true,
      admin: 'admin-1',
    },
  };
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
    }),
  );

  app.use((req: { session?: Record<string, unknown> }, _res, next) => {
    req.app.config = {
      oauth: {
        twitter: { key: 'twitter-key' },
        github: { key: '' },
        facebook: { key: 'facebook-key' },
        google: { key: 'google-key' },
        apple: { key: '' },
        microsoft: { key: 'microsoft-key' },
      },
      webAuthn: { enabled: false },
      emailAuth: { enabled: true },
    };

    if (req.get('x-test-auth') === '1') {
      req.user = createUser();
    }
    next();
  });

  const router = express.Router();
  registerAuthRoutes(router);
  app.use('/api/auth', router);
  return app;
}

describe('auth social callback and session coverage', () => {
  it('keeps callback routes registered for all supported social providers', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'server/src/middlewares/routes.ts'),
      'utf8',
    );

    for (const provider of ['twitter', 'github', 'facebook', 'google', 'apple', 'microsoft']) {
      expect(source).toContain(`/signup/${provider}/callback/`);
      expect(source).toContain(`/login/${provider}/callback/`);
      expect(source).toContain(`/account/settings/${provider}/callback/`);
    }
  });

  it('returns oauth provider availability flags from api', async () => {
    const app = createApp();
    const response = await request(app).get('/api/auth/providers').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.providers).toEqual(
      expect.objectContaining({
        twitter: true,
        github: false,
        facebook: true,
        google: true,
        apple: false,
        microsoft: true,
      }),
    );
  });

  it('returns the consolidated sign-in runtime configuration', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/auth/config')
      .set('Cookie', 'fast_switch=[]')
      .expect(200);

    expect(response.headers['cache-control']).toContain('private');
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      providers: expect.objectContaining({ google: true, github: false }),
      fastSwitchAvailable: false,
      emailCode: expect.objectContaining({ enabled: true, codeLength: 6 }),
      passkeys: expect.objectContaining({ enabled: false, rpName: 'Wikitruth' }),
    }));
  });

  it('persists active role in session across me + role-switch cycle', async () => {
    const app = createApp();
    const agent = request.agent(app);

    const firstMe = await agent.get('/api/auth/me').set('x-test-auth', '1').expect(200);
    expect(firstMe.body.success).toBe(true);
    expect(firstMe.body.activeRole).toBe('contributor');

    await agent
      .post('/api/auth/role-switch')
      .set('x-test-auth', '1')
      .send({ role: 'screener' })
      .expect(200);

    const secondMe = await agent.get('/api/auth/me').set('x-test-auth', '1').expect(200);
    expect(secondMe.body.success).toBe(true);
    expect(secondMe.body.activeRole).toBe('screener');
  });
});
