import express from 'express';
import request from 'supertest';

const mockUpdateChildrenCount = jest.fn();
const mockRecordEntryRevision = jest.fn();
const mockLogEntryEvent = jest.fn();
const mockNotifySubscribers = jest.fn();

const mockDb = {
  Topic: {
    findById: jest.fn(),
    find: jest.fn(),
  },
  Argument: {
    findById: jest.fn(),
    find: jest.fn(),
  },
  Artifact: { findById: jest.fn(), find: jest.fn() },
  Question: { findById: jest.fn(), find: jest.fn() },
  Answer: { findById: jest.fn(), find: jest.fn() },
  Issue: { findById: jest.fn(), find: jest.fn() },
  Opinion: { findById: jest.fn(), find: jest.fn() },
  TopicLink: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  ArgumentLink: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  ObjectLink: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
};

jest.mock('../../server/src/app', () => ({
  db: {
    models: mockDb,
  },
}));

jest.mock('../../server/src/utils/flowUtils', () => ({
  updateChildrenCount: (...args: unknown[]) => mockUpdateChildrenCount(...args),
}));
jest.mock('../../server/src/controllers/api/revisionWriteRecorder', () => ({
  recordEntryRevision: (...args: unknown[]) => mockRecordEntryRevision(...args),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args: unknown[]) => mockLogEntryEvent(...args),
}));
jest.mock('../../server/src/services/notificationsService', () => ({
  notifySubscribers: (...args: unknown[]) => mockNotifySubscribers(...args),
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

function createApp(user?: { id: string; _id: string; username: string; onboarding?: unknown; canPlayRoleOf?: (role: string) => boolean } | null) {
  const app = express();
  app.use(express.json());
  app.use((req: { session?: Record<string, unknown> }, _res, next) => {
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
    for (const modelName of ['Artifact', 'Question', 'Answer', 'Issue', 'Opinion'] as const) {
      mockDb[modelName].findById.mockResolvedValue(null);
      mockDb[modelName].find.mockImplementation(() => chain([]));
    }
    mockDb.TopicLink.findOne.mockReturnValue(leanDoc(null));
    mockDb.ArgumentLink.findOne.mockReturnValue(leanDoc(null));
    mockDb.ObjectLink.findOne.mockReturnValue(leanDoc(null));
    mockRecordEntryRevision.mockResolvedValue(undefined);
    mockLogEntryEvent.mockResolvedValue(undefined);
    mockNotifySubscribers.mockResolvedValue(0);
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
    expect(response.body.truncated).toBe(false);
    expect(mockDb.Topic.find).toHaveBeenCalledTimes(1);
  });

  it('returns the requested public ancestor chain from the root toward the selected topic', async () => {
    mockDb.Topic.findById
      .mockReturnValueOnce(leanDoc({
        _id: 'topic-3', title: 'Addiction', friendlyUrl: 'addiction', parentId: 'topic-2', private: false,
        screening: { status: 1 },
      }))
      .mockReturnValueOnce(leanDoc({
        _id: 'topic-2', title: 'Health & Medicine', friendlyUrl: 'health-medicine', parentId: 'topic-1', private: false,
        screening: { status: 1 },
      }))
      .mockReturnValueOnce(leanDoc({
        _id: 'topic-1', title: 'Knowledge', friendlyUrl: 'knowledge', parentId: 'topic-0', private: false,
        screening: { status: 1 },
      }))
      .mockReturnValueOnce(leanDoc({
        _id: 'topic-0', title: 'Foundation', friendlyUrl: 'foundation', parentId: null, private: false,
        screening: { status: 1 },
      }));
    mockDb.Topic.find.mockImplementationOnce(() => chain([]));

    const response = await request(createApp()).get(
      '/outline/tree?rootId=topic-3&depth=2&ancestorDepth=20&childLimit=11',
    );

    expect(response.status).toBe(200);
    expect(response.body.tree.title).toBe('Addiction');
    expect(response.body.ancestors.map((topic: { title: string }) => topic.title)).toEqual([
      'Foundation',
      'Knowledge',
      'Health & Medicine',
    ]);
  });

  it('retains public archived ancestors as marked historical hierarchy context', async () => {
    mockDb.Topic.findById
      .mockReturnValueOnce(leanDoc({
        _id: 'msg', title: 'Monosodium glutamate (MSG)', friendlyUrl: 'msg', parentId: 'health', private: false,
        screening: { status: 1 },
      }))
      .mockReturnValueOnce(leanDoc({
        _id: 'health', title: 'Health', friendlyUrl: 'health', parentId: 'knowledge', private: false,
        screening: { status: 3 },
      }))
      .mockReturnValueOnce(leanDoc({
        _id: 'knowledge', title: 'Knowledge', friendlyUrl: 'knowledge', parentId: null, private: false,
        screening: { status: 1 },
      }));
    mockDb.Topic.find.mockImplementationOnce(() => chain([]));

    const response = await request(createApp()).get(
      '/outline/tree?rootId=msg&depth=2&ancestorDepth=20&childLimit=11',
    );

    expect(response.status).toBe(200);
    expect(response.body.ancestors).toEqual([
      expect.objectContaining({ _id: 'knowledge', archived: false }),
      expect.objectContaining({ _id: 'health', archived: true }),
    ]);
  });

  it.each([
    ['private', { private: true, screening: { status: 1 } }],
    ['pending', { private: false, screening: { status: 0 } }],
    ['rejected', { private: false, screening: { status: 2 } }],
  ])('does not expose a %s ancestor as hierarchy context', async (_label, ancestorState) => {
    mockDb.Topic.findById
      .mockReturnValueOnce(leanDoc({
        _id: 'child', title: 'Child', parentId: 'hidden-parent', private: false, screening: { status: 1 },
      }))
      .mockReturnValueOnce(leanDoc({
        _id: 'hidden-parent', title: 'Hidden parent', parentId: null, ...ancestorState,
      }));
    mockDb.Topic.find.mockImplementationOnce(() => chain([]));

    const response = await request(createApp()).get(
      '/outline/tree?rootId=child&depth=2&ancestorDepth=20',
    );

    expect(response.status).toBe(200);
    expect(response.body.ancestors).toEqual([]);
  });

  it('does not expose a private selected root', async () => {
    mockDb.Topic.findById.mockReturnValueOnce(leanDoc({
      _id: 'private-topic', title: 'Private topic', private: true,
    }));

    const response = await request(createApp()).get('/outline/tree?rootId=private-topic&depth=2');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(mockDb.Topic.find).not.toHaveBeenCalled();
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

    const app = createApp({
      id: 'user-1', _id: 'user-1', username: 'contributor',
      onboarding: { contributor: { completed: true } }, canPlayRoleOf: () => false,
    });
    const response = await request(app).post('/outline/link').send({
      parentId: 'topic-parent',
      targetId: 'argument-target',
      relationship: 'support',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(mockDb.ArgumentLink.findOneAndUpdate).toHaveBeenCalled();
    expect(mockDb.ArgumentLink.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ relationship: 'support' }),
      expect.objectContaining({ relationship: 'support', against: false }),
      expect.objectContaining({ upsert: true }),
    );
    expect(mockUpdateChildrenCount).toHaveBeenCalled();
    expect(mockRecordEntryRevision).toHaveBeenCalledWith(expect.objectContaining({ objectType: 31 }));
    expect(mockLogEntryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'graph.relationship.created' }));
    expect(mockNotifySubscribers).toHaveBeenCalled();
  });

  it('rejects contributors who have not completed onboarding', async () => {
    const response = await request(createApp({
      id: 'user-1', _id: 'user-1', username: 'new-user', onboarding: { contributor: { completed: false } },
    })).post('/outline/link').send({ parentId: 'topic-parent', targetId: 'argument-target', relationship: 'child' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ONBOARDING_REQUIRED');
  });

  it('does not expose or link a private target owned by another user', async () => {
    mockDb.Topic.findById
      .mockResolvedValueOnce({ _id: 'topic-parent', private: false })
      .mockResolvedValueOnce(null);
    mockDb.Argument.findById.mockResolvedValueOnce({
      _id: 'argument-target', private: true, createUserId: 'different-user',
    });
    const response = await request(createApp({
      id: 'user-1', _id: 'user-1', username: 'contributor', onboarding: { contributor: { completed: true } },
    })).post('/outline/link').send({ parentId: 'topic-parent', targetId: 'argument-target', relationship: 'support' });
    expect(response.status).toBe(403);
    expect(mockDb.ArgumentLink.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns an idempotent duplicate result without new audit activity', async () => {
    mockDb.Topic.findById
      .mockResolvedValueOnce({ _id: 'topic-parent' })
      .mockResolvedValueOnce({ _id: 'topic-target' });
    mockDb.TopicLink.findOne.mockReturnValueOnce(leanDoc({ _id: 'existing-link', relationship: 'related' }));
    const response = await request(createApp({
      id: 'user-1', _id: 'user-1', username: 'contributor', onboarding: { contributor: { completed: true } },
    })).post('/outline/link').send({ parentId: 'topic-parent', targetId: 'topic-target', relationship: 'related' });
    expect(response.status).toBe(200);
    expect(response.body.conflict).toBe('already_linked');
    expect(mockRecordEntryRevision).not.toHaveBeenCalled();
  });

  it('creates claim-level evidence links with bounded citation locators', async () => {
    mockDb.Topic.findById
      .mockResolvedValueOnce({ _id: 'topic-parent', private: false })
      .mockResolvedValueOnce(null);
    mockDb.Argument.findById.mockResolvedValueOnce(null);
    mockDb.Artifact.findById.mockResolvedValueOnce({ _id: 'artifact-target', private: false, 'screening.status': 1 });
    mockDb.ObjectLink.findOneAndUpdate.mockReturnValueOnce(leanDoc({ _id: 'object-link-1', relationship: 'supports' }));
    const response = await request(createApp({
      id: 'user-1', _id: 'user-1', username: 'contributor', onboarding: { contributor: { completed: true } },
    })).post('/outline/link').send({
      parentId: 'topic-parent', targetId: 'artifact-target', relationship: 'supports',
      citation: { locatorType: 'page', locator: '14', quote: 'A short excerpt', note: 'Direct support' },
    });
    expect(response.status).toBe(201);
    expect(response.body.link).toEqual(expect.objectContaining({
      objectName: 'objectLink', relationship: 'supports', citation: expect.objectContaining({ locator: '14' }),
    }));
    expect(mockDb.ObjectLink.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ leftType: 1, rightType: 6, relationship: 'supports' }),
      expect.objectContaining({ relationship: 'supports', extras: { citation: expect.objectContaining({ locator: '14' }) } }),
      expect.objectContaining({ upsert: true }),
    );
  });
});
