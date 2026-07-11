import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import moderationApi from '../../services/api/moderation';
import { CommentRevisionNotice, IssueResolutionPanel } from './DiscussionIntegrityPanels';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/api/moderation', () => ({
  __esModule: true,
  default: { resolveIssue: jest.fn(), reviewCommentRelevance: jest.fn() },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedApi = moderationApi as jest.Mocked<typeof moderationApi>;

function reviewerAuth() {
  return {
    user: { _id: 'reviewer-1', username: 'reviewer', roles: { reviewer: true } },
    isAuthenticated: true,
    isLoading: false,
    activeRole: 'reviewer' as const,
    setActiveRole: jest.fn(),
    availableRoles: ['reviewer' as const],
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  };
}

describe('Discussion integrity panels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue(reviewerAuth());
  });

  it('shows the revision transition and records comment relevance', async () => {
    const user = userEvent.setup();
    mockedApi.reviewCommentRelevance.mockResolvedValue({
      success: true,
      discussionContext: { status: 'obsolete', revisionNumber: 1, supersededByRevisionNumber: 2, reason: 'No longer applies.' },
    });
    render(<CommentRevisionNotice opinion={{
      _id: 'opinion-1',
      title: 'Old concern',
      ownerType: '1',
      discussionContext: { status: 'potentially_obsolete', revisionNumber: 1, supersededByRevisionNumber: 2 },
    }} />);

    expect(screen.getByText(/older entry revision/i)).toBeInTheDocument();
    expect(screen.getByText(/entry is now at revision 2/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/comment relevance decision/i), 'obsolete');
    await user.type(screen.getByLabelText(/comment relevance reason/i), 'The corrected revision removes this concern.');
    await user.click(screen.getByRole('button', { name: /record relevance/i }));

    await waitFor(() => expect(mockedApi.reviewCommentRelevance).toHaveBeenCalledWith('opinion-1', {
      status: 'obsolete',
      reason: 'The corrected revision removes this concern.',
    }));
    expect(await screen.findByText(/comment relevance: obsolete/i)).toBeInTheDocument();
  });

  it('records an issue resolution with a reason', async () => {
    const user = userEvent.setup();
    mockedApi.resolveIssue.mockResolvedValue({
      success: true,
      resolution: { status: 'resolved', reason: 'The underlying claim was corrected.' },
    });
    render(<IssueResolutionPanel issue={{ _id: 'issue-1', title: 'Source problem', ownerType: '1' }} />);

    await user.type(screen.getByLabelText(/resolution reason/i), 'The underlying claim was corrected.');
    await user.click(screen.getByRole('button', { name: /record decision/i }));

    await waitFor(() => expect(mockedApi.resolveIssue).toHaveBeenCalledWith('issue-1', {
      status: 'resolved',
      reason: 'The underlying claim was corrected.',
    }));
    expect(await screen.findByText(/issue status: resolved/i)).toBeInTheDocument();
  });
});
