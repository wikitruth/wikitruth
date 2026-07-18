import { getTrustedRankingScore } from './trustedRanking';
import type { LegacyEntity } from '../types/legacy';

function entry(values: Partial<LegacyEntity>): LegacyEntity {
  return values as LegacyEntity;
}

describe('trusted ranking', () => {
  it('uses reputation as a bounded input without overriding screening quality', () => {
    expect(getTrustedRankingScore(entry({ authorReputationScore: 70, screening: { status: 1 } }), 0)).toBe(42);
    expect(getTrustedRankingScore(entry({ authorReputationScore: 70, screening: { status: 0 } }), 0)).toBe(7);
  });

  it('defaults safely for entries without a scorecard snapshot', () => {
    expect(getTrustedRankingScore(entry({ screening: { status: 1 } }), 0)).toBe(35);
  });

  it('prioritizes reviewed evidence and consensus while penalizing unresolved issues', () => {
    const trusted = getTrustedRankingScore(entry({
      screening: { status: 1 },
      provenance: { sourceQuality: { total: 20 } },
      verdicts: { factual: { status: 'supported', decisionMode: 'consensus', evidenceRefs: ['artifact-1'] } },
    }), 0);
    const disputed = getTrustedRankingScore(entry({
      screening: { status: 1 },
      childrenCount: { issues: { accepted: 4 } },
      authorReputationScore: 100,
    }), 10000);
    expect(trusted).toBeGreaterThan(disputed);
  });
});
