const logEntryEvent = jest.fn();

const source = {
  _id: 'source-1',
  title: 'The Climate Policy',
  content: 'Shared evidence summary',
  friendlyUrl: 'the-climate-policy',
  ownerType: 1,
  ownerId: 'owner-1',
  parentId: null,
  categoryId: 'owner-1',
  groupId: null,
  private: false,
  editDate: new Date('2026-07-11T10:00:00.000Z'),
};
const target = {
  ...source,
  _id: 'target-1',
  title: 'The climate policy!',
  friendlyUrl: 'climate-policy',
  editDate: new Date('2026-07-11T11:00:00.000Z'),
};
const candidate = {
  ...source,
  _id: 'candidate-1',
  title: 'The climate policy',
};

const topicUpdateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
const topicUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
const redirectUpdateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
const redirectCreate = jest.fn().mockResolvedValue({ _id: 'redirect-1' });
const redirectFindOne = jest.fn().mockReturnValue({ lean: async () => null });

const mockTopicModel = {
  findById: jest.fn((id: string) => ({
    lean: async () => id === source._id ? source : id === target._id ? target : null,
  })),
  find: jest.fn(() => ({
    limit: () => ({
      lean: async () => [candidate],
    }),
  })),
  updateOne: topicUpdateOne,
  updateMany: topicUpdateMany,
};

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      Topic: mockTopicModel,
      EntryRedirect: {
        findOne: (...args: unknown[]) => redirectFindOne(...args),
        create: (...args: unknown[]) => redirectCreate(...args),
        updateOne: (...args: unknown[]) => redirectUpdateOne(...args),
      },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args: unknown[]) => logEntryEvent(...args),
}));

jest.mock('../../server/src/services/entryRevisionService', () => ({
  captureEntryRevision: jest.fn(async (options: { objectId: string; source: string }) => ({
    _id: `${options.objectId}-${options.source}-revision`,
  })),
}));

import {
  buildDuplicateScope,
  compareDuplicateEntries,
  findCompletedRedirect,
  findDuplicateCandidates,
  mergeEntries,
  normalizeDuplicateText,
} from '../../server/src/services/entryMergeService';

describe('entry merge service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    topicUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    topicUpdateMany.mockResolvedValue({ modifiedCount: 2 });
    redirectUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    redirectCreate.mockResolvedValue({ _id: 'redirect-1' });
    redirectFindOne.mockReturnValue({ lean: async () => null });
  });

  it('normalizes Unicode, punctuation, and whitespace deterministically', () => {
    expect(normalizeDuplicateText('  CAFÉ -- Policy!  ')).toBe('café policy');
    expect(compareDuplicateEntries(source, target)).toEqual(expect.objectContaining({
      rule: 'exact_title',
      score: 1,
    }));
  });

  it('skips redirect lookup for friendly slugs before ObjectId casting', async () => {
    await expect(findCompletedRedirect(1, 'philippine-popular-figures')).resolves.toBeNull();
    expect(redirectFindOne).not.toHaveBeenCalled();
  });

  it('builds a parent-scoped query and returns deterministic candidates', async () => {
    expect(buildDuplicateScope(1, source)).toEqual({
      private: false,
      groupId: null,
      parentId: null,
      categoryId: 'owner-1',
      ownerId: 'owner-1',
      ownerType: 1,
    });
    await expect(findDuplicateCandidates(1, source._id)).resolves.toEqual([
      expect.objectContaining({ id: 'candidate-1', rule: 'exact_title' }),
    ]);
  });

  it('rejects a stale merge preview before creating a redirect', async () => {
    await expect(mergeEntries({
      objectType: 1,
      sourceId: source._id,
      targetId: target._id,
      sourceEditDate: '2026-07-11T09:00:00.000Z',
      targetEditDate: target.editDate.toISOString(),
      reason: 'These entries describe the same scoped topic.',
      actor: { id: 'admin-1', username: 'admin' },
    })).rejects.toThrow(/changed after the merge preview/i);
    expect(redirectCreate).not.toHaveBeenCalled();
  });

  it('archives the source, moves relationships, completes the redirect, and audits the merge', async () => {
    const result = await mergeEntries({
      objectType: 1,
      sourceId: source._id,
      targetId: target._id,
      sourceEditDate: source.editDate.toISOString(),
      targetEditDate: target.editDate.toISOString(),
      reason: 'These entries describe the same scoped topic.',
      actor: { id: 'admin-1', username: 'admin' },
    });

    expect(result.target.path).toBe('/topics/entry/climate-policy/target-1');
    expect(topicUpdateOne).toHaveBeenCalledWith(
      { _id: source._id },
      expect.objectContaining({ $set: expect.objectContaining({ 'screening.status': 3 }) }),
    );
    expect(redirectUpdateOne).toHaveBeenCalledWith(
      { _id: 'redirect-1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'completed' }) }),
    );
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'privileged',
      eventType: 'moderation.entry.merged',
    }));
  });
});
