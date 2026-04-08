'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('supertest');

const findTopicById = jest.fn();
const updateTopics = jest.fn();
const findTopics = jest.fn();
const findUser = jest.fn();
const syncChildren = jest.fn();
const updateChildrenCountBatch = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      Topic: {
        findById: (...args) => findTopicById(...args),
        updateMany: (...args) => updateTopics(...args),
        find: (...args) => findTopics(...args),
      },
      User: {
        findOne: (...args) => findUser(...args),
      },
    },
  },
}));

jest.mock('../../server/src/utils/flowUtils', () => ({
  getDbModelByObjectType: jest.fn(),
  createOwnerQueryFromQuery: jest.fn(() => ({})),
  getParent: jest.fn(),
  updateChildrenCount: jest.fn(),
  syncChildren: (...args) => syncChildren(...args),
  updateChildrenCountBatch: (...args) => updateChildrenCountBatch(...args),
}));

function createApp(user) {
  const app = express();
  app.use(bodyParser.json());
  app.use(function (req, _res, next) {
    req.user = user;
    next();
  });

  const router = express.Router();
  require('../../server/src/controllers/api/moderation')(router);
  app.use('/api/moderation', router);
  return app;
}

describe('Moderation ownership migration', function () {
  beforeEach(() => {
    jest.clearAllMocks();
    updateTopics.mockResolvedValue({ acknowledged: true });
    syncChildren.mockResolvedValue(undefined);
    updateChildrenCountBatch.mockResolvedValue({ processed: 1 });
  });

  it('requires admin role', async function () {
    const app = createApp({
      id: 'user-1',
      canPlayRoleOf: () => false,
    });

    await request(app)
      .post('/api/moderation/ownership-migration')
      .send({ topicId: 'topic-1', targetScope: 'public' })
      .expect(403);
  });

  it('rejects non-root topics', async function () {
    findTopicById.mockResolvedValue({
      _id: 'topic-1',
      parentId: 'topic-parent',
    });

    const app = createApp({
      id: 'admin-1',
      canPlayRoleOf: (role) => role === 'admin',
    });

    await request(app)
      .post('/api/moderation/ownership-migration')
      .send({ topicId: 'topic-1', targetScope: 'public' })
      .expect(400);
  });

  it('rejects cross-user diary migrations without ownership transfer', async function () {
    findTopicById.mockResolvedValue({
      _id: 'topic-1',
      parentId: null,
      groupId: null,
      ownerType: -1,
      ownerId: null,
      private: false,
      createUserId: 'creator-1',
    });
    findUser.mockReturnValue({
      select: () => ({
        lean: async () => ({ _id: 'other-user', username: 'other' }),
      }),
    });

    const app = createApp({
      id: 'admin-1',
      canPlayRoleOf: (role) => role === 'admin',
    });

    await request(app)
      .post('/api/moderation/ownership-migration')
      .send({ topicId: 'topic-1', targetScope: 'diary', username: 'other' })
      .expect(409);
  });

  it('migrates subtree to public scope and refreshes children counts', async function () {
    findTopicById.mockImplementation(async () => {
      return {
        _id: 'topic-root',
        parentId: null,
        groupId: null,
        ownerType: 5,
        ownerId: 'owner-1',
        private: true,
        createUserId: 'creator-1',
        editUserId: 'editor-1',
      };
    });
    findTopics.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: 'topic-root' }, { _id: 'topic-child' }],
      }),
    });

    const app = createApp({
      id: 'admin-1',
      canPlayRoleOf: (role) => role === 'admin',
    });

    const response = await request(app)
      .post('/api/moderation/ownership-migration')
      .send({ topicId: 'topic-root', targetScope: 'public' })
      .expect(200);

    expect(updateTopics).toHaveBeenCalledWith(
      { $or: [{ _id: 'topic-root' }, { categoryId: 'topic-root' }] },
      expect.objectContaining({
        $set: expect.objectContaining({
          private: false,
          ownerType: -1,
          ownerId: null,
        }),
      })
    );
    expect(syncChildren).toHaveBeenCalled();
    expect(updateChildrenCountBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ entryId: 'topic-root', entryType: expect.any(Number) }),
        expect.objectContaining({ entryId: 'topic-child', entryType: expect.any(Number) }),
      ]),
      { transactional: true }
    );
    expect(response.body.success).toBe(true);
    expect(response.body.migration.targetScope).toBe('public');
  });
});
