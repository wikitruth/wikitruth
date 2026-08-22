import React from 'react';
import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from '../../test-utils/render';
import type { StructuredDebate } from '../../services/api/structuredDebates';
import StructuredDebateWorkspace from './StructuredDebateWorkspace';

function fixture(overrides: Partial<StructuredDebate> = {}): StructuredDebate {
  return {
    id: 'pilot-1', status: 'open', proposition: 'Public evidence should guide this claim.',
    entry: { objectName: 'topic', id: 'entry-1', title: 'Source topic', path: '/topics/entry/source/entry-1', discussionPath: '/topics/entry/source/entry-1/discussion' },
    format: { version: 'structured-debate-pilot-v1', consentVersion: 'structured-debate-pilot-consent-v1', participantLimit: 12, phaseWindowHours: 72, contributionLimitPerParticipantPerPhase: 1, evidenceRequired: true, alternatingStances: true, verdictImpact: 'none' },
    phases: [
      { key: 'opening', label: 'Opening positions', order: 1, status: 'active', startedAt: '2026-08-05T00:00:00.000Z', dueAt: '2026-08-08T00:00:00.000Z', completedAt: null },
      { key: 'response', label: 'Responses', order: 2, status: 'upcoming', startedAt: null, dueAt: null, completedAt: null },
      { key: 'rebuttal', label: 'Rebuttals', order: 3, status: 'upcoming', startedAt: null, dueAt: null, completedAt: null },
      { key: 'closing', label: 'Closing statements', order: 4, status: 'upcoming', startedAt: null, dueAt: null, completedAt: null },
    ],
    currentPhaseKey: 'opening', currentTurnStance: 'supports',
    participants: [{ key: 'p1', publicUsername: 'public-supporter', stance: 'supports', status: 'active', consentedAt: '2026-08-05T00:00:00.000Z', withdrewAt: null }],
    contributions: [{ id: 'c1', participantKey: 'p1', publicUsername: 'public-supporter', stance: 'supports', phaseKey: 'opening', contributionType: 'evidence', content: 'This public contribution links a source and makes its reasoning inspectable.', evidenceLinks: [{ url: 'https://example.test/source', label: 'Public source' }], revisionNumber: 1, createDate: '2026-08-05T01:00:00.000Z', editDate: '2026-08-05T01:00:00.000Z' }],
    audit: [{ kind: 'transition', eventType: 'pilot_created', label: 'pilot created', actor: 'facilitator', occurredAt: '2026-08-05T00:00:00.000Z' }],
    reviewerSummary: null, verdictStatus: null, createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-05T01:00:00.000Z', closedAt: null,
    viewer: { authenticated: true, canCreatePilot: false, canFacilitate: false, canJoin: true, participant: null, canContribute: false, contributionBlockReason: 'Opt in and choose a stance before contributing.' },
    ...overrides,
  };
}

const callbacks = {
  onSignIn: jest.fn(), onJoin: jest.fn().mockResolvedValue(undefined), onWithdraw: jest.fn().mockResolvedValue(undefined),
  onSubmit: jest.fn().mockResolvedValue(undefined), onTransition: jest.fn().mockResolvedValue(undefined),
};

describe('StructuredDebateWorkspace', () => {
  beforeEach(() => Object.values(callbacks).forEach((callback) => callback.mockClear()));

  it('keeps public contributions balanced with audit context and ordinary discussion', async () => {
    const { container } = render(<StructuredDebateWorkspace debate={fixture()} signedIn busy={false} {...callbacks} />);
    expect(screen.getByRole('heading', { name: 'Supports' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Challenges' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Public audit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open ordinary discussion/i })).toHaveAttribute('href', '/topics/entry/source/entry-1/discussion');
    expect(screen.getByText('No verdict impact')).toBeInTheDocument();
    expect(screen.queryByText(/winner/i)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('labels software-agent contributions separately from the accountable participant', () => {
    const debate = fixture();
    debate.contributions[0] = {
      ...debate.contributions[0], authorshipType: 'agent',
      agentAttribution: { clientName: 'Debate research helper', runId: 'run-1', model: 'local', provider: 'local', purpose: '', sources: [] },
    };
    debate.audit.push({
      kind: 'contribution', eventType: 'contribution_submitted', label: 'contribution submitted',
      actor: 'public-supporter', occurredAt: '2026-08-05T01:00:00.000Z', authorshipType: 'agent',
      agentAttribution: debate.contributions[0].agentAttribution,
    });
    render(<StructuredDebateWorkspace debate={debate} signedIn busy={false} {...callbacks} />);
    expect(screen.getByText('Agent contribution')).toBeInTheDocument();
    expect(screen.getByText(/via Debate research helper/i)).toBeInTheDocument();
  });

  it('requires both explicit acknowledgements before joining', async () => {
    render(<StructuredDebateWorkspace debate={fixture()} signedIn busy={false} {...callbacks} />);
    const join = screen.getByRole('button', { name: /Join the supporting side/i });
    expect(join).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/accept the pilot format/i));
    fireEvent.click(screen.getByLabelText(/accept public attribution/i));
    expect(join).toBeEnabled();
    fireEvent.click(join);
    await waitFor(() => expect(callbacks.onJoin).toHaveBeenCalledWith('supports'));
  });

  it('shows a contribution composer only for an active participant on their turn', async () => {
    const debate = fixture({
      viewer: { authenticated: true, canCreatePilot: false, canFacilitate: false, canJoin: false, participant: { key: 'p1', publicUsername: 'public-supporter', stance: 'supports', status: 'active' }, canContribute: true, contributionBlockReason: null },
    });
    render(<StructuredDebateWorkspace debate={debate} signedIn busy={false} {...callbacks} />);
    fireEvent.change(screen.getByLabelText('Evidence URL'), { target: { value: 'https://example.test/evidence' } });
    fireEvent.change(screen.getByLabelText('Contribution'), { target: { value: 'This is a sufficiently detailed evidence-linked pilot contribution.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit contribution' }));
    await waitFor(() => expect(callbacks.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ contributionType: 'argument' })));
  });

  it('exposes governed transitions only to a facilitator', () => {
    render(<StructuredDebateWorkspace debate={fixture({ viewer: { authenticated: true, canCreatePilot: true, canFacilitate: true, canJoin: false, participant: null, canContribute: false, contributionBlockReason: 'Opt in first.' } })} signedIn busy={false} {...callbacks} />);
    fireEvent.click(screen.getByText('Facilitator controls'));
    expect(screen.getByRole('button', { name: 'Pause pilot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advance phase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel pilot' })).toBeDisabled();
  });
});
