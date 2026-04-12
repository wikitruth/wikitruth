import express from 'express';
import request from 'supertest';

const mockPostForm = jest.fn();

const mockDb = {
  User: {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    encryptPassword: jest.fn(),
    validatePassword: jest.fn(),
  },
  Account: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  Admin: {
    findByIdAndUpdate: jest.fn(),
  },
  LoginAttempt: {
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../server/src/utils/httpClient', () => ({
  postForm: (...args: unknown[]) => mockPostForm(...args),
}));

jest.mock('../../server/src/app', () => ({
  db: {
    models: mockDb,
  },
}));

const registerAuthRoutes = require('../../server/src/controllers/api/auth');

function createApp(options?: {
  recaptchaSecret?: string;
  user?: {
    _id: string;
    id: string;
    username: string;
    email: string;
    roles: Record<string, unknown>;
    canPlayRoleOf?: (role: string) => boolean;
  } | null;
}) {
  const app = express();
  app.use(express.json());

  (app as unknown as { config?: Record<string, unknown> }).config = {
    grecaptcha: {
      secret: options?.recaptchaSecret || '',
    },
    requireAccountVerification: false,
    jwtSecret: 'test-jwt-secret',
  };

  app.use((req: any, _res, next) => {
    req.session = req.session || {};
    req.session.preferences = req.session.preferences || {};
    req.user = options?.user || null;
    req.login = (user: unknown, done?: (err?: unknown) => void) => {
      req.user = user;
      if (done) done();
    };
    next();
  });

  const router = express.Router();
  registerAuthRoutes(router);
  app.use('/auth', router);
  return app;
}

describe('auth captcha and role-switch endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.User.encryptPassword.mockImplementation((password: string, done: (err: unknown, hash?: string) => void) => {
      done(null, `${password}-hash`);
    });
    mockDb.User.findOne.mockResolvedValue(null);
    mockDb.LoginAttempt.countDocuments.mockResolvedValue(0);
    mockDb.User.create.mockImplementation(async (payload: Record<string, unknown>) => ({
      _id: 'user-1',
      id: 'user-1',
      username: payload.username,
      email: payload.email,
      roles: {},
      save: jest.fn().mockResolvedValue(undefined),
    }));
    mockDb.Account.create.mockImplementation(async () => ({
      _id: 'account-1',
      save: jest.fn().mockResolvedValue(undefined),
    }));
  });

  it('rejects signup when captcha token is missing and captcha secret is configured', async () => {
    const app = createApp({ recaptchaSecret: 'captcha-secret' });

    const response = await request(app).post('/auth/signup').send({
      username: 'demo_user',
      email: 'demo@example.com',
      password: 'secret12',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid captcha');
    expect(mockPostForm).not.toHaveBeenCalled();
  });

  it('accepts signup when captcha token is valid', async () => {
    mockPostForm.mockResolvedValue({ statusCode: 200, body: { success: true } });
    const app = createApp({ recaptchaSecret: 'captcha-secret' });

    const response = await request(app).post('/auth/signup').send({
      username: 'demo_user',
      email: 'demo@example.com',
      password: 'secret12',
      recaptchaResponse: 'valid-token',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.activeRole).toBe('contributor');
    expect(mockPostForm).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({
        secret: 'captcha-secret',
        response: 'valid-token',
      }),
    );
  });

  it('persists role switch when authenticated', async () => {
    const app = createApp({
      user: {
        _id: 'user-1',
        id: 'user-1',
        username: 'moderator',
        email: 'm@example.com',
        roles: { admin: 'admin-role-id', screener: true },
      },
    });

    const response = await request(app).post('/auth/role-switch').send({ role: 'reader' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.activeRole).toBe('reader');
  });
});
