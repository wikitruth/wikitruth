import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import moderationApi from '../../services/api/moderation';
import ChangeRequestPanel from './ChangeRequestPanel';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/api/moderation', () => ({
  __esModule: true,
  default: {
    submitChangeRequest: jest.fn(),
    listChangeRequests: jest.fn(),
    resolveChangeRequest: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedApi = moderationApi as jest.Mocked<typeof moderationApi>;

function authValue(roles: Record<string, string> = {}) {
  return {
    user: { _id: 'user-1', username: 'alice', roles },
    isAuthenticated: true,
    isLoading: false,
    activeRole: 'user',
    setActiveRole: jest.fn(),
    availableRoles: ['user'],
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  };
}

describe('ChangeRequestPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue(authValue());
    mockedApi.submitChangeRequest.mockResolvedValue({
      success: true,
      request: {
        _id: 'request-1',
        objectType: 1,
        objectId: 'topic-1',
        baseRevisionId: 'revision-1',
        baseRevisionNumber: 1,
        proposedChanges: { title: 'Suggested title' },
        summary: 'Improve the title for clarity.',
        status: 'open',
      },
    });
    mockedApi.listChangeRequests.mockResolvedValue({ success: true, requests: [] });
  });

  it('submits a suggestion without directly editing the entry', async () => {
    const user = userEvent.setup();
    render(<ChangeRequestPanel target={{ key: 'topic', id: 'topic-1' }} />);

    await user.type(screen.getByLabelText(/suggested title/i), 'Suggested title');
    await user.type(screen.getByLabelText(/reason for this suggestion/i), 'Improve the title for clarity.');
    await user.click(screen.getByRole('button', { name: /submit suggestion/i }));

    await waitFor(() => expect(mockedApi.submitChangeRequest).toHaveBeenCalledWith(
      { key: 'topic', id: 'topic-1' },
      {
        proposedChanges: { title: 'Suggested title' },
        summary: 'Improve the title for clarity.',
      },
    ));
  });

  it('lets a reviewer accept only selected proposed fields', async () => {
    mockedUseAuth.mockReturnValue(authValue({ reviewer: 'reviewer-1' }));
    mockedApi.listChangeRequests.mockResolvedValue({
      success: true,
      requests: [{
        _id: 'request-1',
        objectType: 1,
        objectId: 'topic-1',
        baseRevisionId: 'revision-1',
        baseRevisionNumber: 1,
        proposedChanges: { title: 'Suggested title', content: 'Suggested content' },
        summary: 'Improve the title and content.',
        status: 'open',
        createUsername: 'alice',
      }],
    });
    mockedApi.resolveChangeRequest.mockResolvedValue({
      success: true,
      request: {
        _id: 'request-1',
        objectType: 1,
        objectId: 'topic-1',
        baseRevisionId: 'revision-1',
        baseRevisionNumber: 1,
        proposedChanges: { title: 'Suggested title', content: 'Suggested content' },
        summary: 'Improve the title and content.',
        status: 'partially_accepted',
      },
    });

    const user = userEvent.setup();
    render(<ChangeRequestPanel target={{ key: 'topic', id: 'topic-1' }} />);
    expect(await screen.findByText('Improve the title and content.')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.type(screen.getByLabelText(/decision note/i), 'Title is clear.');
    await user.click(screen.getByRole('button', { name: /accept selected fields/i }));

    await waitFor(() => expect(mockedApi.resolveChangeRequest).toHaveBeenCalledWith('request-1', {
      action: 'accept',
      acceptedFields: ['title'],
      decisionNote: 'Title is clear.',
    }));
  });
});

