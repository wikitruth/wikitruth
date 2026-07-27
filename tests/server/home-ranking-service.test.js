'use strict';

jest.mock('../../server/src/app', () => ({ db: { models: {} } }));

describe('home ranking service', () => {
  it('separates recency, momentum, and durable engagement without verdict inputs', () => {
    const { rankHomeEntries } = require('../../server/src/services/homeRankingService');
    const now = new Date('2026-07-28T12:00:00.000Z');
    const entries = [
      { _id: 'new', objectName: 'topic', title: 'Newest', editDate: '2026-07-28T11:00:00.000Z', childrenCount: {} },
      { _id: 'active', objectName: 'topic', title: 'Active', editDate: '2026-07-28T10:00:00.000Z', childrenCount: { opinions: { accepted: 4 } } },
      { _id: 'established', objectName: 'topic', title: 'Established', editDate: '2026-01-01T00:00:00.000Z', childrenCount: { answers: { accepted: 10 } }, verdicts: { factual: { status: 'refuted' } } },
    ];
    const reactions = [
      { entryId: 'active', objectType: 1, value: 'upvote' },
      ...Array.from({ length: 12 }, () => ({ entryId: 'established', objectType: 1, value: 'expose' })),
    ];

    const result = rankHomeEntries(entries, reactions, now);

    expect(result.buckets.latest[0].title).toBe('Newest');
    expect(result.buckets.trending[0].title).toBe('Active');
    expect(result.buckets.top[0].title).toBe('Established');
    expect(result.formulas.disclaimer).toMatch(/never establish.*verdicts.*truth/i);
  });
});
