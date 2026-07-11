import {
  REPUTATION_FORMULA_VERSION,
  calculateReputationFromCounts,
  type ReputationCounts,
} from '../../server/src/services/reputationService';

const emptyCounts: ReputationCounts = {
  contributions: 0,
  acceptedContributions: 0,
  rejectedContributions: 0,
  acceptedArtifacts: 0,
  artifactReviews: 0,
  verdictVotes: 0,
  privilegedActions: 0,
  acceptedChangeRequests: 0,
  rejectedChangeRequests: 0,
};

describe('deterministic reputation scorecard', () => {
  it('does not assign trust to an account without auditable activity', () => {
    const snapshot = calculateReputationFromCounts('user-1', 'new-user', emptyCounts, new Date('2026-07-12T00:00:00Z'));
    expect(snapshot.score).toBe(0);
    expect(snapshot.level).toBe('New contributor');
    expect(snapshot.badges).toEqual([]);
    expect(snapshot.formulaVersion).toBe(REPUTATION_FORMULA_VERSION);
  });

  it('awards only badges whose published thresholds are satisfied', () => {
    const snapshot = calculateReputationFromCounts('user-2', 'reviewer', {
      contributions: 30,
      acceptedContributions: 27,
      rejectedContributions: 3,
      acceptedArtifacts: 6,
      artifactReviews: 8,
      verdictVotes: 12,
      privilegedActions: 25,
      acceptedChangeRequests: 6,
      rejectedChangeRequests: 1,
    });

    expect(snapshot.score).toBeGreaterThanOrEqual(70);
    expect(snapshot.dimensions.quality).toBeGreaterThanOrEqual(80);
    expect(snapshot.badges.map((badge) => badge.key)).toEqual(expect.arrayContaining([
      'first-contribution',
      'established-contributor',
      'evidence-builder',
      'consensus-builder',
      'revision-steward',
      'trusted-reviewer',
    ]));
  });

  it('is deterministic for the same evidence counts', () => {
    const counts = { ...emptyCounts, contributions: 4, acceptedContributions: 3, rejectedContributions: 1 };
    const first = calculateReputationFromCounts('u', 'name', counts, new Date('2026-01-01T00:00:00Z'));
    const second = calculateReputationFromCounts('u', 'name', counts, new Date('2026-01-01T00:00:00Z'));
    expect(second).toEqual(first);
  });
});
