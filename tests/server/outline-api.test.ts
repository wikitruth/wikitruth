import express from 'express';
import request from 'supertest';

const mockUpdateChildrenCount = jest.fn();

const mockDb = {
  Topic: {
    findById: jest.fn(),
    find: jest.fn(),
  },
  Argument: {
    findById: jest.fn(),
    find: jest.fn(),
  },
  TopicLink: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  ArgumentLink: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
};

jest.mock('../../server/src/app', () => ({
  db: {
    models: mockDb,
  },
}));

jest.mock('../../server/src/utils/flowUtils', () => ({
  updateChildrenCount: (...args: unknown[]) => mockUpdateChildrenCount(...args),
}));

const registerOutlineRoutes = require('../../server/src/controllers/api/outline');

function chain<T>(rows: T[]) {
  return {
    sort: () => ({
      limit: () => ({
        lean: async () => rows,
      }),
    }),
  };
}

function leanDoc<T>(doc: T) {
  return {
    lean: async () => doc,
  };
}

function createApp(user?: { id: string; _id: string; username: string } | null) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = user || null;
    next();
  });
  const router = express.Router();
  registerOutlineRoutes(router);
  app.use('/outline', router);
  return app;
}

describe('outline api endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.Topic.find.mockImplementation(() => chain([]));
    mockDb.Argument.find.mockImplementation(() => chain([]));
    mockDb.TopicLink.findOne.mockReturnValue(leanDoc(null));
    mockDb.ArgumentLink.findOne.mockReturnValue(leanDoc(null));
  });

  it('returns topic tree for a root id', async () => {
    mockDb.Topic.findById.mockReturnValueOnce(
      leanDoc({
        _id: 'topic-1',
        title: 'Root Topic',
        friendlyUrl: 'root-topic',
      }),
    );
    mockDb.Topic.find.mockImplementationOnce(() => chain([]));

    const app = createApp();
    const response = await request(app).get('/outline/tree?rootId=topic-1&depth=2');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tree.title).toBe('Root Topic');
  });

  it('searches topics and arguments by query', async () => {
    mockDb.Topic.find.mockImplementationOnce(() =>
      chain([
        { _id: 'topic-1', title: 'Topic One', friendlyUrl: 'topic-one' },
      ]),
    );
    mockDb.Argument.find.mockImplementationOnce(() =>
      chain([
        { _id: 'arg-1', title: 'Argument One', friendlyUrl: 'argument-one' },
      ]),
    );

    const app = createApp();
    const response = await request(app).get('/outline/search?q=one&types=topic,argument&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockDb.Topic.find).toHaveBeenCalled();
    expect(mockDb.Argument.find).toHaveBeenCalled();
    expect(response.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: 'topic-1', objectName: 'topic' }),
        expect.objectContaining({ _id: 'arg-1', objectName: 'argument' }),
      ]),
    );
  });

  it('creates an argument link under a topic parent', async () => {
    mockDb.Topic.findById
      .mockResolvedValueOnce({
        _id: 'topic-parent',
        title: 'Parent Topic',
      })
      .mockResolvedValueOnce(null);
    mockDb.Argument.findById.mockResolvedValueOnce({
      _id: 'argument-target',
      title: 'Target Argument',
    });
    mockDb.ArgumentLink.findOneAndUpdate.mockReturnValue(
      leanDoc({
        _id: 'argument-link-1',
      }),
    );

    const app = createApp({ id: 'user-1', _id: 'user-1', username: 'admin' });
    const response = await request(app).post('/outline/link').send({
      parentId: 'topic-parent',
      targetId: 'argument-target',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(mockDb.ArgumentLink.findOneAndUpdate).toHaveBeenCalled();
    expect(mockUpdateChildrenCount).toHaveBeenCalled();
  });
});
