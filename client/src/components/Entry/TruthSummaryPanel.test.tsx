import React from 'react';
import { render, screen } from '../../test-utils/render';
import userEvent from '@testing-library/user-event';
import TruthSummaryPanel from './TruthSummaryPanel';
import { getTruthSummary } from '../../services/api/epistemic';

jest.mock('../../services/api/epistemic', () => ({ getTruthSummary: jest.fn() }));
const mockedGetTruthSummary = getTruthSummary as jest.MockedFunction<typeof getTruthSummary>;

describe('TruthSummaryPanel', () => {
  it('makes override provenance and material dissent visible', async () => {
    mockedGetTruthSummary.mockResolvedValue({
      entry: { id: 'topic-1', objectName: 'topic', objectType: 1, title: 'Claim', revisionId: 'revision-1' },
      channels: [{
        channel: 'factual', status: 'supported', reasoning: 'Primary records support this claim.', framework: '',
        decisionMode: 'admin_override', administratorOverride: true, overrideReason: 'A primary record required a correction.',
        policyVersion: '2026-07-v3-critical', sensitivity: 'critical', eligibleVotes: 5, leadingVotes: 4,
        averageConfidence: 88, distinctAffiliations: 4, decidedAt: '2026-07-01T00:00:00.000Z',
        revalidateAt: '2026-08-01T00:00:00.000Z', revalidationDue: false,
        dissent: { totalVotes: 1, statuses: [{ status: 'refuted', count: 1 }], rationales: ['A source conflicts.'], evidenceRefs: [] },
      }],
      evidenceMap: [{ artifactId: 'artifact-1', title: 'Primary record', friendlyUrl: 'primary-record', artifactType: 'document', source: '', relationship: 'supports' }],
      unresolvedIssues: [], generatedAt: '2026-07-28T00:00:00.000Z',
    });
    const user = userEvent.setup();
    render(<TruthSummaryPanel objectName="topic" objectId="topic-1" />);
    expect(await screen.findByText('Administrator final say')).toBeInTheDocument();
    expect(screen.getByText(/A primary record required a correction/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /why this verdict/i }));
    expect(screen.getByText(/Material dissent/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Primary record' })).toBeInTheDocument();
  });
});

