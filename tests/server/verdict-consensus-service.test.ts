import {
  computeChannelConsensus,
  consensusDecisionDetails,
  DEFAULT_VERDICT_CONSENSUS_POLICY,
} from '../../server/src/services/verdictConsensusService';

function vote(status: string, confidence = 80, extras: Record<string, unknown> = {}) {
  return {
    channel: 'factual',
    channelStatus: status,
    confidence,
    conflictDeclared: false,
    rationale: `Reasoned support for ${status}.`,
    evidenceRefs: [],
    ...extras,
  };
}

describe('channel-specific verdict consensus', () => {
  it('requires the configured quorum, supermajority, and confidence', () => {
    expect(computeChannelConsensus('factual', [vote('supported'), vote('supported')]).reached).toBe(false);

    const reached = computeChannelConsensus('factual', [
      vote('supported', 80),
      vote('supported', 70),
      vote('refuted', 90),
    ]);
    expect(reached).toEqual(expect.objectContaining({
      policyVersion: DEFAULT_VERDICT_CONSENSUS_POLICY.version,
      eligibleVotes: 3,
      threshold: 2,
      leadingStatus: 'supported',
      leadingCount: 2,
      reached: true,
    }));
  });

  it('excludes conflicts and abstentions from the status majority', () => {
    const summary = computeChannelConsensus('factual', [
      vote('supported'),
      vote('supported'),
      vote('refuted', 100, { conflictDeclared: true }),
      vote('abstain', 0),
    ]);
    expect(summary).toEqual(expect.objectContaining({
      totalVotes: 4,
      eligibleVotes: 2,
      excludedConflictVotes: 1,
      abstentions: 1,
      reached: false,
    }));
  });

  it('keeps factual and ethical votes independent', () => {
    const votes = [
      vote('supported'),
      vote('supported'),
      vote('supported'),
      { ...vote('impermissible'), channel: 'ethical', framework: 'human rights' },
    ];
    expect(computeChannelConsensus('factual', votes).reached).toBe(true);
    expect(computeChannelConsensus('ethical', votes)).toEqual(expect.objectContaining({
      totalVotes: 1,
      reached: false,
    }));
  });

  it('builds decision provenance from only the leading eligible votes', () => {
    const votes = [
      vote('supported', 80, { evidenceRefs: ['artifact-1'], rationale: 'Primary record one supports the claim.' }),
      vote('supported', 90, { evidenceRefs: ['artifact-1', 'artifact-2'], rationale: 'Primary record two confirms the claim.' }),
      vote('refuted', 90, { evidenceRefs: ['artifact-3'] }),
    ];
    const summary = computeChannelConsensus('factual', votes);
    expect(consensusDecisionDetails(summary, votes)).toEqual(expect.objectContaining({
      evidenceRefs: ['artifact-1', 'artifact-2'],
      reasoning: expect.stringContaining('Consensus reached with 2 of 3 eligible votes'),
    }));
  });
});

