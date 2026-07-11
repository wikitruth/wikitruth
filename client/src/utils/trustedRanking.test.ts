import { getTrustedRankingScore } from './trustedRanking';
import type { LegacyEntity } from '../types/legacy';

function entry(values: Partial<LegacyEntity>): LegacyEntity {
  return values as LegacyEntity;
}

describe('trusted ranking', () => {
  it('uses reputation as an input without overriding screening quality', () => {
    expect(getTrustedRankingScore(entry({ authorReputationScore: 70, screening: { status: 1 } }), 20)).toBe(82);
    expect(getTrustedRankingScore(entry({ authorReputationScore: 70, screening: { status: 0 } }), 20)).toBe(72);
  });

  it('defaults safely for entries without a scorecard snapshot', () => {
    expect(getTrustedRankingScore(entry({ screening: { status: 1 } }), 0)).toBe(10);
  });
});
