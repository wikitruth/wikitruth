'use strict';

const {
  buildArchivedCountPlan,
  calculateArchivedCounts,
} = require('../../scripts/migrations/children-count-archived');

describe('archived children-count migration', function () {
  it('mirrors topic child relationships and screening status', function () {
    const plan = buildArchivedCountPlan('topic', { _id: 'topic-1' });

    expect(plan.topics).toEqual([
      { collection: 'topics', query: { parentId: 'topic-1', 'screening.status': 3 } },
      { collection: 'topiclinks', query: { parentId: 'topic-1', 'screening.status': 3 } },
    ]);
    expect(plan.arguments).toEqual([
      { collection: 'arguments', query: { ownerId: 'topic-1', parentId: null, 'screening.status': 3 } },
      { collection: 'argumentlinks', query: { ownerId: 'topic-1', parentId: null, 'screening.status': 3 } },
    ]);
  });

  it('adds archived counts across linked and concrete children', async function () {
    const collection = jest.fn((name) => ({
      countDocuments: jest.fn(async () => (name.endsWith('links') ? 2 : 3)),
    }));
    const database = { collection };

    const counts = await calculateArchivedCounts(database, 'topic', { _id: 'topic-1' });

    expect(counts.topics).toBe(5);
    expect(counts.arguments).toBe(5);
    expect(counts.artifacts).toBe(3);
    expect(counts.questions).toBe(3);
  });
});
