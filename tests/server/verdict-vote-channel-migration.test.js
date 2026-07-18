'use strict';

const { isLegacyUniqueIndex, mapLegacyStatus } = require('../../scripts/migrations/verdict-vote-channels');

describe('verdict vote channel migration', () => {
  it('maps legacy factual statuses without inventing ethical votes', () => {
    expect(mapLegacyStatus(1)).toBe('supported');
    expect(mapLegacyStatus(13)).toBe('supported');
    expect(mapLegacyStatus(2)).toBe('refuted');
    expect(mapLegacyStatus(24)).toBe('refuted');
    expect(mapLegacyStatus(3)).toBe('mixed');
    expect(mapLegacyStatus(0)).toBe('insufficient_evidence');
  });

  it('only identifies the obsolete uniqueness constraint', () => {
    expect(isLegacyUniqueIndex({ unique: true, key: { objectType: 1, objectId: 1, voterUserId: 1 } })).toBe(true);
    expect(isLegacyUniqueIndex({ unique: true, key: { objectType: 1, objectId: 1, channel: 1, voterUserId: 1 } })).toBe(false);
    expect(isLegacyUniqueIndex({ unique: false, key: { objectType: 1, objectId: 1, voterUserId: 1 } })).toBe(false);
  });
});
