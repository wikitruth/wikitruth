import React from 'react';
import EntryActionsMenu from './EntryActionsMenu';
import { fireEvent, render, screen } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import moderationApi from '../../services/api/moderation';
import type { LegacyEntity } from '../../types/legacy';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/api/moderation', () => ({
  __esModule: true,
  default: {
    takeOwnership: jest.fn().mockResolvedValue({ success: true }),
    deleteEntry: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedModerationApi = moderationApi as jest.Mocked<typeof moderationApi>;

function renderMenu(entry: Partial<LegacyEntity>) {
  render(
    <EntryActionsMenu
      entry={
        {
          _id: 'entry-1',
          objectName: 'topic',
          objectType: 1,
          createUserId: 'owner-1',
          title: 'Entry',
          ...entry,
        } as LegacyEntity
      }
      editPath="/topics/create?id=entry-1"
    />,
  );
}

describe('EntryActionsMenu moderation actions', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReturnValue({
      user: {
        _id: 'user-1',
        username: 'moderator',
        roles: {
          admin: 'admin-role-id',
          screener: true,
        },
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'admin' as const,
      setActiveRole: jest.fn(),
      availableRoles: ['contributor' as const, 'admin' as const],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    mockedModerationApi.takeOwnership.mockResolvedValue({ success: true } as never);
    mockedModerationApi.deleteEntry.mockResolvedValue({ success: true } as never);
  });

  it('routes screening action through modern screening route', () => {
    renderMenu({ objectName: 'topic', _id: 'topic-1' });

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /screening status/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/screening?topic=topic-1');
  });

  it('routes convert action through modern convert route', () => {
    renderMenu({ objectName: 'argument', objectType: 2, _id: 'arg-1' });

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /convert/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/convert?argument=arg-1');
  });

  it('hides screening and convert for non-moderators', () => {
    mockUseAuth.mockReturnValue({
      user: {
        _id: 'user-2',
        username: 'viewer',
        roles: {},
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'contributor' as const,
      setActiveRole: jest.fn(),
      availableRoles: ['contributor' as const],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    renderMenu({ objectName: 'topic', _id: 'topic-1' });
    fireEvent.click(screen.getByRole('button', { name: /actions/i }));

    expect(screen.queryByRole('button', { name: /screening status/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /convert/i })).not.toBeInTheDocument();
  });
});
