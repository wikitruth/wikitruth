import React from 'react';
import { render, screen } from '@testing-library/react';
import ReputationScorecard from './ReputationScorecard';

describe('ReputationScorecard', () => {
  it('renders explainable dimensions, formula version, and earned badges', () => {
    render(<ReputationScorecard reputation={{
      score: 72,
      level: 'Trusted contributor',
      dimensions: { quality: 80, participation: 60, stewardship: 70, evidence: 55 },
      counts: {
        contributions: 20,
        acceptedContributions: 18,
        rejectedContributions: 2,
        acceptedArtifacts: 5,
        artifactReviews: 3,
        verdictVotes: 10,
        privilegedActions: 4,
        acceptedChangeRequests: 2,
        rejectedChangeRequests: 0,
      },
      badges: [{ key: 'evidence-builder', label: 'Evidence Builder', description: 'Five accepted artifacts.' }],
      formulaVersion: '2026-07-v1',
      calculatedAt: '2026-07-12T00:00:00.000Z',
    }} />);

    expect(screen.getByLabelText('Reputation score 72 out of 100')).toBeInTheDocument();
    expect(screen.getByText('Trusted contributor')).toBeInTheDocument();
    expect(screen.getByText('Formula 2026-07-v1')).toBeInTheDocument();
    expect(screen.getByText('Evidence Builder')).toHaveAttribute('title', 'Five accepted artifacts.');
    expect(screen.getByText('Quality')).toBeInTheDocument();
  });
});
