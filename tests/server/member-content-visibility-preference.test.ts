import express from 'express';
import request from 'supertest';

const mockFindById = jest.fn();

jest.mock('../../server/src/app', () => ({
  __esModule: true,
  default: {
    db: {
      models: {
        User: { findById: (...args: unknown[]) => mockFindById(...args) },
      },
    },
  },
}));

jest.mock('../../server/src/services/reputationService', () => ({
  attachReputationSnapshots: jest.fn(),
  getOrRefreshReputation: jest.fn(),
}));

const registerMembers = require('../../server/src/controllers/api/members');

function createApp(user: Record<string, unknown> | null = { _id: 'user-1' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user as never;
    next();
  });
  const router = express.Router();
  registerMembers(router);
  app.use('/members', router);
  return app;
}

describe('member content visibility preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists a supported value without dropping existing preferences', async () => {
    const member = {
      _id: 'user-1',
      username: 'reader',
      email: 'reader@example.test',
      preferences: { privateProfile: true, contentVisibility: 'accepted' },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindById.mockResolvedValue(member);

    const response = await request(createApp())
      .put('/members/me/preferences')
      .send({ contentVisibility: 'active' })
      .expect(200);

    expect(member.preferences).toEqual({ privateProfile: true, contentVisibility: 'active' });
    expect(member.save).toHaveBeenCalledTimes(1);
    expect(response.body.member.preferences).toEqual(member.preferences);
  });

  it('rejects unsupported values and unauthenticated requests', async () => {
    await request(createApp())
      .put('/members/me/preferences')
      .send({ contentVisibility: 'hidden' })
      .expect(400);

    await request(createApp(null))
      .put('/members/me/preferences')
      .send({ contentVisibility: 'active' })
      .expect(401);

    expect(mockFindById).not.toHaveBeenCalled();
  });
});
