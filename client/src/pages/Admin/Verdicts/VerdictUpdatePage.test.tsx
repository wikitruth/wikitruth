import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import VerdictUpdatePage from './VerdictUpdatePage';
import moderationApi from '../../../services/api/moderation';
import { useAuth } from '../../../context/AuthContext';

const navigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
  useParams: () => ({ id: 'topic-1' }),
  useSearchParams: () => [new URLSearchParams('type=topic')],
}));
jest.mock('../../../services/api/moderation', () => ({
  __esModule: true,
  default: {
    entry: jest.fn(),
    listVerdictVotes: jest.fn(),
    submitVerdictVote: jest.fn(),
    updateVerdictChannel: jest.fn(),
  },
}));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../components/Form/RichTextEditor', () => ({
  __esModule: true,
  default: ({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (name: string, value: string) => void }) => (
    <label>{label}<textarea aria-label={label} value={value} onChange={(event) => onChange(name, event.target.value)} /></label>
  ),
}));
jest.mock('../../../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));

const api = moderationApi as jest.Mocked<typeof moderationApi>;
const auth = useAuth as jest.MockedFunction<typeof useAuth>;
const summary = {
  channel: 'factual' as const,
  policyVersion: '2026-07-v2',
  totalVotes: 1,
  eligibleVotes: 1,
  excludedConflictVotes: 0,
  abstentions: 0,
  threshold: 2,
  leadingStatus: 'supported',
  leadingCount: 1,
  leadingRatio: 1,
  leadingAverageConfidence: 75,
  reached: false,
  counts: [{ status: 'supported', count: 1 }],
};

function authValue(roles: Record<string, unknown>) {
  return {
    user: { _id: 'user-1', username: 'reviewer', roles },
    isAuthenticated: true,
    isLoading: false,
    activeRole: Object.keys(roles)[0] || null,
    setActiveRole: jest.fn(),
    availableRoles: Object.keys(roles),
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  } as ReturnType<typeof useAuth>;
}

describe('VerdictUpdatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockReturnValue(authValue({ reviewer: true }));
    api.entry.mockResolvedValue({
      success: true,
      target: { objectType: 1, objectName: 'topic', id: 'topic-1' },
      entry: {
        _id: 'topic-1',
        title: 'Climate claim',
        verdictChannels: {
          factual: { status: 'pending', decisionMode: 'none' },
          ethical: { status: 'pending', decisionMode: 'none' },
        },
      },
      screeningStatuses: [],
      verdictStatuses: [],
      verdictChannelStatuses: {
        factual: ['pending', 'supported', 'refuted', 'mixed', 'insufficient_evidence'],
        ethical: ['pending', 'permissible', 'impermissible', 'contested', 'not_applicable'],
      },
      decisionHistory: [],
    });
    api.listVerdictVotes.mockResolvedValue({
      success: true,
      votes: [],
      summary: { ...summary, consensusReached: false, consensusStatus: 'supported' },
      channels: { factual: summary, ethical: { ...summary, channel: 'ethical' } },
    });
    api.submitVerdictVote.mockResolvedValue({
      success: true,
      vote: {},
      summary: { ...summary, consensusReached: false, consensusStatus: 'supported' },
      decision: { published: false },
    });
    api.updateVerdictChannel.mockResolvedValue({ success: true });
  });

  it('lets a reviewer vote without exposing administrator final say', async () => {
    const user = userEvent.setup();
    render(<VerdictUpdatePage />);
    expect(await screen.findByText('Reviewer consensus')).toBeInTheDocument();
    expect(screen.queryByText('Administrator Final Say')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Vote rationale'), 'Primary evidence directly supports this claim.');
    await user.click(screen.getByRole('button', { name: /submit channel vote/i }));
    await waitFor(() => expect(api.submitVerdictVote).toHaveBeenCalledWith(
      { key: 'topic', id: 'topic-1' },
      expect.objectContaining({ channel: 'factual', channelStatus: 'supported', confidence: 75 }),
    ));
  });

  it('requires an explicit reason and acknowledgement for administrator final say', async () => {
    auth.mockReturnValue(authValue({ admin: 'admin-role' }));
    const user = userEvent.setup();
    render(<VerdictUpdatePage />);
    expect(await screen.findByText('Administrator Final Say')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /record final say/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/why are you overriding/i), 'A time-sensitive correction is required after reviewing the evidence.');
    await user.click(screen.getByLabelText(/acknowledge that this is/i));
    await user.click(submit);
    await waitFor(() => expect(api.updateVerdictChannel).toHaveBeenCalledWith(
      { key: 'topic', id: 'topic-1' },
      expect.objectContaining({
        channel: 'factual', acknowledgeOverride: true,
        overrideReason: 'A time-sensitive correction is required after reviewing the evidence.',
      }),
    ));
  });
});
