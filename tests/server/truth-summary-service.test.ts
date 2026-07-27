const topicFindOne = jest.fn();
const objectLinkFind = jest.fn();
const artifactFind = jest.fn();
const issueFind = jest.fn();
const revisionFindOne = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      Topic: { findOne: (...args: unknown[]) => topicFindOne(...args) },
      Argument: {},
      Answer: {},
      ObjectLink: { find: (...args: unknown[]) => objectLinkFind(...args) },
      Artifact: { find: (...args: unknown[]) => artifactFind(...args) },
      Issue: { find: (...args: unknown[]) => issueFind(...args) },
      EntryRevision: { findOne: (...args: unknown[]) => revisionFindOne(...args) },
    },
  },
}));

import { buildPublicTruthSummary } from '../../server/src/services/truthSummaryService';

describe('public truth summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    topicFindOne.mockReturnValue({ lean: async () => ({
      _id: '507f1f77bcf86cd799439011',
      title: 'A reviewed claim',
      private: false,
      screening: { status: 1 },
      verdicts: {
        factual: {
          status: 'supported',
          reasoning: 'Multiple records support the claim.',
          evidenceRefs: ['507f1f77bcf86cd799439012'],
          decisionMode: 'admin_override',
          overrideReason: 'Urgent correction after primary-source review.',
          policyVersion: '2026-07-v3-critical',
          sensitivity: 'critical',
          revalidateAt: new Date(Date.now() - 1000),
          consensusSnapshot: {
            eligibleVotes: 5,
            leadingCount: 4,
            leadingAverageConfidence: 88,
            distinctAffiliations: 4,
            dissent: { totalVotes: 1, statuses: [{ status: 'refuted', count: 1 }], rationales: ['One record conflicts.'], evidenceRefs: [] },
          },
        },
      },
    }) });
    objectLinkFind.mockReturnValue({ lean: async () => [] });
    artifactFind.mockReturnValue({ select: () => ({ lean: async () => [{
      _id: '507f1f77bcf86cd799439012', title: 'Primary record', friendlyUrl: 'primary-record', artifactType: 'document', provenance: {},
    }] }) });
    issueFind.mockReturnValue({ select: () => ({ sort: () => ({ lean: async () => [{
      _id: '507f1f77bcf86cd799439013', title: 'Conflicting date', friendlyUrl: 'conflicting-date', issueType: 10, resolution: { status: 'open' },
    }] }) }) });
    revisionFindOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => ({ _id: '507f1f77bcf86cd799439014' }) }) }) });
  });

  it('exposes evidence, dissent, unresolved issues, freshness, and override provenance', async () => {
    const summary = await buildPublicTruthSummary({
      objectName: 'topic',
      objectId: '507f1f77bcf86cd799439011',
    });
    expect(summary?.channels[0]).toEqual(expect.objectContaining({
      status: 'supported',
      administratorOverride: true,
      revalidationDue: true,
      dissent: expect.objectContaining({ totalVotes: 1 }),
    }));
    expect(summary?.evidenceMap).toEqual([expect.objectContaining({ title: 'Primary record' })]);
    expect(summary?.unresolvedIssues).toEqual([expect.objectContaining({ title: 'Conflicting date' })]);
    expect(summary?.entry.revisionId).toBe('507f1f77bcf86cd799439014');
  });

  it('does not expose an unscreened entry to public callers', async () => {
    topicFindOne.mockReturnValue({ lean: async () => ({
      _id: '507f1f77bcf86cd799439011', screening: { status: 0 }, private: false,
    }) });
    await expect(buildPublicTruthSummary({
      objectName: 'topic', objectId: '507f1f77bcf86cd799439011',
    })).resolves.toBeNull();
  });
});

