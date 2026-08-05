import React from 'react';
import { axe } from 'jest-axe';
import { render, screen } from '../../test-utils/render';
import TransparencyPage from './TransparencyPage';
import { getPublicTrustDashboard } from '../../services/api/transparency';

jest.mock('../../services/api/transparency', () => ({ getPublicTrustDashboard: jest.fn() }));

const mockedDashboard = getPublicTrustDashboard as jest.MockedFunction<typeof getPublicTrustDashboard>;
const dashboard = {
  generatedAt: '2026-08-05T00:00:00.000Z',
  scope: {
    label: 'Public, non-private Wikitruth and Civic Core records',
    publicRecordsOnly: true as const,
    windowDays: 365,
    minimumCohort: 5,
    includesCivicRecords: true as const,
  },
  summary: { publicKnowledge: 24, accepted: 16, pending: 6, archived: 2 },
  quality: [
    { key: 'evidence_linked_verdicts', label: 'Evidence-linked verdicts', display: '75%', description: 'Evidence description', percent: 75, numerator: 6, denominator: 8, suppressed: false },
    { key: 'resolved_appeals', label: 'Resolved appeals', display: 'Not shown', description: 'Appeal description', suppressed: true, suppressionReason: 'small_cohort' as const },
  ],
  lifecycle: [
    { key: 'accepted' as const, label: 'Accepted', value: 16, description: 'Published knowledge.' },
    { key: 'pending' as const, label: 'Pending', value: 6, description: 'Under review.' },
    { key: 'archived' as const, label: 'Archived', value: 2, description: 'Historical context.' },
  ],
  governance: [
    { key: 'verdict_explanations', label: 'Verdict explanations published', display: '8', description: 'Reasons are public.', value: 8, suppressed: false },
    { key: 'appeals_reviewed', label: 'Appeals reviewed', display: 'Not shown', description: 'Appeals are reviewed.', suppressed: true, suppressionReason: 'small_cohort' as const },
  ],
  privacy: {
    title: 'Private by design',
    summary: 'No identities, private records, or small-cohort activity are exposed.',
    exclusions: ['Names, usernames, emails, IP addresses, sessions, and account identifiers'],
  },
  methodology: ['Counts use persisted public records only.', 'Popularity is excluded.'],
};

describe('TransparencyPage', () => {
  beforeEach(() => {
    mockedDashboard.mockResolvedValue(dashboard);
  });

  it('renders public aggregates, methodology, and privacy protection without identities', async () => {
    render(<TransparencyPage />, { route: '/transparency' });

    expect(await screen.findByRole('heading', { name: 'Transparency & Trust' })).toBeInTheDocument();
    expect(await screen.findByText('24')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Private by design')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view public policies/i })).toHaveAttribute('href', '/policies');
    expect(screen.queryByText(/example@|username-1|session-id/i)).not.toBeInTheDocument();
  });

  it('renders suppressed cohorts as a dash with an accessible explanation', async () => {
    render(<TransparencyPage />, { route: '/transparency' });
    expect(await screen.findByRole('img', { name: 'Resolved appeals: Not shown' })).toBeInTheDocument();
    expect(screen.getAllByText('Not shown').length).toBeGreaterThan(0);
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<TransparencyPage />, { route: '/transparency' });
    await screen.findByText('Private by design');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a fail-closed error state when aggregates are unavailable', async () => {
    mockedDashboard.mockRejectedValueOnce(new Error('Public transparency data is temporarily unavailable'));
    render(<TransparencyPage />, { route: '/transparency' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Public transparency data is temporarily unavailable');
  });
});
