const mockRevisions: Array<Record<string, unknown>> = [];
const mockChangeRequests: Array<Record<string, unknown>> = [];
const mockCurrentEntry: Record<string, unknown> = {
  _id: 'topic-1',
  title: 'Original title',
  content: 'Original content',
  editDate: '2026-07-11T10:00:00.000Z',
};
let mockSequence = 0;
const mockLogEntryEvent = jest.fn();
const mockOpinionUpdateMany = jest.fn();

function matches(record: Record<string, unknown>, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, value]) => String(record[key] ?? '') === String(value ?? ''));
}

function oneQuery<T>(resolve: () => T | null) {
  const query = {
    sort: jest.fn(() => query),
    lean: jest.fn(async () => resolve()),
  };
  return query;
}

function manyQuery<T>(resolve: () => T[]) {
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => resolve()),
  };
  return query;
}

const mockEntryRevisionModel = {
  findOne: jest.fn((query: Record<string, unknown>) => oneQuery(() => {
    const rows = mockRevisions.filter((revision) => matches(revision, query));
    return rows.sort((left, right) => Number(right.revisionNumber) - Number(left.revisionNumber))[0] || null;
  })),
  findById: jest.fn((id: string) => oneQuery(() => mockRevisions.find((revision) => revision._id === id) || null)),
  find: jest.fn((query: Record<string, unknown>) => manyQuery(() => mockRevisions.filter((revision) => matches(revision, query))
    .sort((left, right) => Number(right.revisionNumber) - Number(left.revisionNumber)))),
  countDocuments: jest.fn(async (query: Record<string, unknown>) => mockRevisions.filter((revision) => matches(revision, query)).length),
  create: jest.fn(async (payload: Record<string, unknown>) => {
    const revision = { _id: `revision-${mockRevisions.length + 1}`, createDate: new Date(), ...payload };
    mockRevisions.push(revision);
    return revision;
  }),
};

const mockTopicModel = {
  findById: jest.fn(() => oneQuery(() => ({ ...mockCurrentEntry }))),
  updateOne: jest.fn(async (_query: Record<string, unknown>, update: { $set?: Record<string, unknown>; $unset?: Record<string, unknown> }) => {
    Object.assign(mockCurrentEntry, update.$set || {});
    Object.keys(update.$unset || {}).forEach((field) => delete mockCurrentEntry[field]);
  }),
};

const mockChangeRequestModel = {
  create: jest.fn(async (payload: Record<string, unknown>) => {
    const request = { _id: `request-${mockChangeRequests.length + 1}`, createDate: new Date(), ...payload };
    mockChangeRequests.push(request);
    return request;
  }),
  findById: jest.fn((id: string) => oneQuery(() => mockChangeRequests.find((request) => request._id === id) || null)),
  find: jest.fn((query: Record<string, unknown>) => manyQuery(() => mockChangeRequests.filter((request) => matches(request, query)))),
  updateOne: jest.fn(async (query: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
    const request = mockChangeRequests.find((candidate) => matches(candidate, query));
    if (request) {
      Object.assign(request, update.$set || {});
    }
  }),
};

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      Topic: mockTopicModel,
      EntryRevision: mockEntryRevisionModel,
      EntryRevisionCounter: {
        findOneAndUpdate: jest.fn(() => ({
          lean: async () => ({ sequence: ++mockSequence }),
        })),
      },
      ChangeRequest: mockChangeRequestModel,
      Opinion: {
        updateMany: (...args: unknown[]) => mockOpinionUpdateMany(...args),
      },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args: unknown[]) => mockLogEntryEvent(...args),
}));

import {
  captureEntryRevision,
  createChangeRequest,
  listEntryRevisions,
  resolveChangeRequest,
  rollbackEntry,
} from '../../server/src/services/entryRevisionService';

describe('entry revision and change-request service', () => {
  beforeEach(() => {
    mockRevisions.length = 0;
    mockChangeRequests.length = 0;
    mockSequence = 0;
    Object.keys(mockCurrentEntry).forEach((key) => delete mockCurrentEntry[key]);
    Object.assign(mockCurrentEntry, {
      _id: 'topic-1',
      title: 'Original title',
      content: 'Original content',
      editDate: '2026-07-11T10:00:00.000Z',
    });
    jest.clearAllMocks();
    mockOpinionUpdateMany.mockResolvedValue({ modifiedCount: 2 });
  });

  it('creates immutable numbered revisions and returns metadata without snapshots', async () => {
    await captureEntryRevision({
      objectType: 1,
      objectId: 'topic-1',
      entry: { ...mockCurrentEntry },
      source: 'create',
      summary: 'Initial topic',
      actorId: 'user-1',
      actorUsername: 'alice',
    });
    mockCurrentEntry.title = 'Updated title';
    await captureEntryRevision({
      objectType: 1,
      objectId: 'topic-1',
      entry: { ...mockCurrentEntry },
      source: 'update',
      summary: 'Updated title',
      actorId: 'user-1',
      actorUsername: 'alice',
    });

    expect(mockRevisions).toHaveLength(2);
    expect(mockRevisions[1]).toEqual(expect.objectContaining({
      revisionNumber: 2,
      changedFields: expect.arrayContaining(['title']),
      snapshotHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(mockOpinionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ ownerType: 1, ownerId: 'topic-1' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          'discussionContext.status': 'potentially_obsolete',
          'discussionContext.supersededByRevisionNumber': 2,
        }),
      }),
    );
    const history = await listEntryRevisions({ objectType: 1, objectId: 'topic-1' });
    expect(history.revisions[0]).not.toHaveProperty('snapshot');
  });

  it('applies selected fields and creates a change-request revision', async () => {
    const request = await createChangeRequest({
      objectType: 1,
      objectId: 'topic-1',
      proposedChanges: { title: 'Suggested title', content: 'Suggested content', ownerId: 'forbidden' },
      summary: 'Improve the title and supporting explanation.',
      actorId: 'user-1',
      actorUsername: 'alice',
    });
    const resolved = await resolveChangeRequest({
      id: String(request._id),
      action: 'accept',
      acceptedFields: ['title'],
      decisionNote: 'Title is clearer.',
      actorId: 'reviewer-1',
      actorUsername: 'reviewer',
    });

    expect(mockCurrentEntry.title).toBe('Suggested title');
    expect(mockCurrentEntry.content).toBe('Original content');
    expect(resolved.status).toBe('partially_accepted');
    expect(mockRevisions.at(-1)).toEqual(expect.objectContaining({ source: 'change_request' }));
  });

  it('stores API client attribution and emits an agent revision event', async () => {
    await captureEntryRevision({
      objectType: 1,
      objectId: 'topic-1',
      entry: { ...mockCurrentEntry },
      source: 'create',
      summary: 'Agent-created topic',
      actorId: 'user-1',
      actorUsername: 'accountable-user',
      apiClientId: '507f1f77bcf86cd799439011',
      apiClientName: 'Research agent',
    });
    expect(mockRevisions[0]).toEqual(expect.objectContaining({
      apiClientId: '507f1f77bcf86cd799439011', apiClientName: 'Research agent',
    }));
    expect(mockLogEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'agent.contribution.revision',
      payload: expect.objectContaining({ apiClientName: 'Research agent', revisionNumber: 1 }),
    }));
    const history = await listEntryRevisions({ objectType: 1, objectId: 'topic-1' });
    expect(history.revisions[0]).toEqual(expect.objectContaining({ apiClientName: 'Research agent' }));
  });

  it('marks a request stale when a newer revision exists', async () => {
    const request = await createChangeRequest({
      objectType: 1,
      objectId: 'topic-1',
      proposedChanges: { title: 'Suggested title' },
      summary: 'Improve this title after source review.',
      actorId: 'user-1',
      actorUsername: 'alice',
    });
    mockCurrentEntry.content = 'Concurrent update';
    await captureEntryRevision({
      objectType: 1,
      objectId: 'topic-1',
      entry: { ...mockCurrentEntry },
      source: 'update',
      summary: 'Concurrent update',
    });

    await expect(resolveChangeRequest({
      id: String(request._id),
      action: 'accept',
      decisionNote: 'Looks reasonable.',
      actorId: 'reviewer-1',
      actorUsername: 'reviewer',
    })).rejects.toThrow(/stale/i);
    expect(mockChangeRequests[0].status).toBe('stale');
  });

  it('rolls back through a new revision and removes fields absent from the selected snapshot', async () => {
    const first = await captureEntryRevision({
      objectType: 1,
      objectId: 'topic-1',
      entry: { ...mockCurrentEntry },
      source: 'create',
      summary: 'Initial state',
    });
    Object.assign(mockCurrentEntry, { title: 'Later title', temporaryField: 'remove me' });
    await captureEntryRevision({
      objectType: 1,
      objectId: 'topic-1',
      entry: { ...mockCurrentEntry },
      source: 'update',
      summary: 'Later state',
    });

    const rollback = await rollbackEntry({
      objectType: 1,
      objectId: 'topic-1',
      revisionId: String(first._id),
      reason: 'Restore the last reviewed version.',
      actorId: 'reviewer-1',
      actorUsername: 'reviewer',
    });

    expect(mockCurrentEntry.title).toBe('Original title');
    expect(mockCurrentEntry.temporaryField).toBeUndefined();
    expect(rollback.source).toBe('rollback');
  });
});
