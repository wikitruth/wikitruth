import express from 'express';
import request from 'supertest';

const findUsers = jest.fn();
const countUsers = jest.fn();
const findUserById = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      User: {
        base: {
          Types: { ObjectId: { isValid: (value: string) => /^[a-f0-9]{24}$/i.test(value) } },
        },
        schema: { path: () => ({ instance: 'ObjectId' }) },
        find: (...args: unknown[]) => findUsers(...args),
        countDocuments: (...args: unknown[]) => countUsers(...args),
        findById: (...args: unknown[]) => findUserById(...args),
      },
    },
  },
}));

const registerAdminRoutes = require('../../server/src/controllers/api/admin');

function listQuery(rows: unknown[]) {
  const query = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn().mockResolvedValue(rows),
  };
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

function detailQuery(record: unknown) {
  return { lean: jest.fn().mockResolvedValue(record) };
}

function createApp(admin = true) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = {
      _id: 'admin-1',
      id: 'admin-1',
      username: 'admin',
      canPlayRoleOf: (role: string) => admin && role === 'admin',
    };
    next();
  });
  const router = express.Router();
  registerAdminRoutes(router);
  app.use('/api/admin', router);
  return app;
}

describe('admin user collection responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    countUsers.mockResolvedValue(1);
    findUsers.mockReturnValue(listQuery([]));
    findUserById.mockReturnValue(detailQuery(null));
  });

  it('returns paginated management fields without credentials or provider secrets', async () => {
    const query = listQuery([
      {
        _id: '507f1f77bcf86cd799439011',
        username: 'example-user',
        email: 'example@example.test',
        roles: { reviewer: true },
        password: 'stored-password-hash',
        resetPasswordToken: 'reset-token',
        mobileTokens: [{ tokenHash: 'mobile-token-hash' }],
        github: { accessToken: 'provider-access-token' },
      },
    ]);
    findUsers.mockReturnValue(query);

    const response = await request(createApp())
      .get('/api/admin/users?page=2&limit=10&q=example')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      items: [
        {
          _id: '507f1f77bcf86cd799439011',
          username: 'example-user',
          email: 'example@example.test',
          roles: { reviewer: true },
        },
      ],
      total: 1,
      page: 2,
      limit: 10,
      pages: 1,
      query: 'example',
    });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(findUsers).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.any(Array) }));
    expect(JSON.stringify(response.body)).not.toMatch(/password|token|provider-access-token/i);
  });

  it('clamps page size and search length to bounded values', async () => {
    const query = listQuery([]);
    findUsers.mockReturnValue(query);

    const response = await request(createApp())
      .get(`/api/admin/users?page=0&limit=999&q=${'a'.repeat(150)}`)
      .expect(200);

    expect(response.body).toMatchObject({ page: 1, limit: 100, query: 'a'.repeat(100) });
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it('loads one user directly and applies the same response allowlist', async () => {
    findUserById.mockReturnValue(
      detailQuery({
        _id: '507f1f77bcf86cd799439011',
        username: 'direct-user',
        password: 'stored-password-hash',
      })
    );

    const response = await request(createApp())
      .get('/api/admin/users/507f1f77bcf86cd799439011')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      item: { _id: '507f1f77bcf86cd799439011', username: 'direct-user' },
    });
  });

  it('returns not found without querying malformed object ids', async () => {
    await request(createApp()).get('/api/admin/users/not-an-object-id').expect(404);
    expect(findUserById).not.toHaveBeenCalled();
  });

  it('keeps list and detail endpoints role-gated', async () => {
    await request(createApp(false)).get('/api/admin/users').expect(403);
    await request(createApp(false)).get('/api/admin/users/507f1f77bcf86cd799439011').expect(403);
    expect(findUsers).not.toHaveBeenCalled();
    expect(findUserById).not.toHaveBeenCalled();
  });
});
