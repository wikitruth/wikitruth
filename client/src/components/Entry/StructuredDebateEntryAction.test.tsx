import React from 'react';
import { render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import { getStructuredDebateForEntry } from '../../services/api/structuredDebates';
import StructuredDebateEntryAction from './StructuredDebateEntryAction';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/api/structuredDebates', () => ({ getStructuredDebateForEntry: jest.fn() }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockLookup = getStructuredDebateForEntry as jest.MockedFunction<typeof getStructuredDebateForEntry>;

function auth(user: ReturnType<typeof useAuth>['user']): ReturnType<typeof useAuth> {
  return {
    user, isAuthenticated: Boolean(user), isLoading: false, activeRole: user ? 'contributor' : 'reader',
    setActiveRole: jest.fn(), availableRoles: user ? ['contributor'] : ['reader'], signup: jest.fn(), login: jest.fn(),
    logout: jest.fn(), updateUser: jest.fn(),
  };
}

describe('StructuredDebateEntryAction', () => {
  beforeEach(() => { mockLookup.mockReset(); mockUseAuth.mockReturnValue(auth(null)); });

  it('links everyone to an active entry pilot', async () => {
    mockLookup.mockResolvedValue({ id: 'pilot-1' } as never);
    render(<StructuredDebateEntryAction objectName="topic" entryId="entry-1" title="Entry title" />);
    expect(await screen.findByRole('link', { name: /Structured Debate/i })).toHaveAttribute('href', '/structured-debates/pilot-1');
    expect(mockLookup).toHaveBeenCalledWith('topic', 'entry-1');
  });

  it('offers pilot creation only to reviewers or administrators', async () => {
    mockUseAuth.mockReturnValue(auth({ _id: 'reviewer-1', username: 'reviewer', roles: { reviewer: true } }));
    mockLookup.mockResolvedValue(null);
    render(<StructuredDebateEntryAction objectName="topic" entryId="entry-1" title="Entry title" />);
    const link = await screen.findByRole('link', { name: /Start Debate/i });
    expect(link.getAttribute('href')).toContain('/structured-debates/new?');
    expect(link.getAttribute('href')).toContain('entryObjectName=topic');
  });

  it('leaves ordinary entry actions uncluttered when no pilot exists', async () => {
    mockLookup.mockResolvedValue(null);
    render(<StructuredDebateEntryAction objectName="topic" entryId="entry-1" title="Entry title" />);
    await waitFor(() => expect(mockLookup).toHaveBeenCalled());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
