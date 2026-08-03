'use strict';

require('ts-node/register/transpile-only');

const {
  assertChildrenCountInvariants,
  normalizeChildrenCountUpdateTasks,
} = require('../../server/src/services/childrenCountGuardrails');

describe('Children count guardrails', function () {
  it('deduplicates and normalizes batched children-count updates', function () {
    const tasks = normalizeChildrenCountUpdateTasks([
      { entryId: 'topic-a', entryType: 1, specificEntryType: 2 },
      { entryId: 'topic-a', entryType: 1, specificEntryType: 2 },
      { entryId: 'topic-a', entryType: '1', specificEntryType: '2' },
      { entryId: 'topic-a', entryType: 1, specificEntryType: null },
      { entryId: 'topic-b', entryType: 1, specificEntryType: 2 },
      { entryId: '', entryType: 1, specificEntryType: 2 },
      { entryId: 'topic-c', entryType: 'not-number', specificEntryType: 2 },
    ]);

    expect(tasks).toEqual([
      { entryId: 'topic-a', entryType: 1, specificEntryType: 2 },
      { entryId: 'topic-a', entryType: 1, specificEntryType: null },
      { entryId: 'topic-b', entryType: 1, specificEntryType: 2 },
    ]);
  });

  it('accepts valid children-count totals', function () {
    expect(() =>
      assertChildrenCountInvariants(
        {
          topics: { accepted: 4, pending: 1, rejected: 2, archived: 3, total: 7 },
          arguments: { accepted: 3, pending: 0, rejected: 1, total: 4 },
        },
        { entryType: 1, entryId: 'topic-1' }
      )
    ).not.toThrow();
  });

  it('throws on invalid children-count totals', function () {
    expect(() =>
      assertChildrenCountInvariants(
        {
          topics: { accepted: 1, pending: 2, rejected: 3, total: 99 },
        },
        { entryType: 1, entryId: 'topic-2' }
      )
    ).toThrow('childrenCount invariant violation');
  });
});
