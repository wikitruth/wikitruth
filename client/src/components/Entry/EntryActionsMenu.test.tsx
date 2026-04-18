import React from 'react';
import EntryActionsMenu from './EntryActionsMenu';
import { fireEvent, render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import moderationApi from '../../services/api/moderation';
import notificationsApi from '../../services/api/notifications';
import * as clipboardPage from '../../pages/ClipboardPage';
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
    submitReaderSignal: jest.fn().mockResolvedValue({ success: true }),
    submitAppeal: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('../../services/api/notifications', () => ({
  __esModule: true,
  default: {
    getSubscription: jest.fn().mockResolvedValue({
      success: true,
      subscription: { followed: false, triggers: [] },
    }),
    setSubscription: jest.fn().mockResolvedValue({
      success: true,
      subscription: { followed: true, triggers: ['reply'] },
    }),
  },
}));

jest.mock('../../pages/ClipboardPage', () => ({
  addToClipboard: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedModerationApi = moderationApi as jest.Mocked<typeof moderationApi>;
const mockedNotificationsApi = notificationsApi as jest.Mocked<typeof notificationsApi>;
const mockedClipboard = clipboardPage as jest.Mocked<typeof clipboardPage>;

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
  const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);

  afterAll(() => {
    confirmSpy.mockRestore();
  });

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
    mockedNotificationsApi.getSubscription.mockResolvedValue({
      success: true,
      subscription: { followed: false, triggers: [] },
    } as never);
    mockedClipboard.addToClipboard.mockReset();
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

  it('routes reply/link/report/history and clipboard actions', () => {
    renderMenu({ objectName: 'topic', _id: 'topic-1', title: 'Topic A' });

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/opinions/create?parentId=topic-1&parentType=topic');

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /link to/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/outline/link?parentId=topic-1&parentTitle=Topic%20A');

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /report/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/issues/create?topicId=topic-1');

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /view history/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/timeline?objectName=topic&id=topic-1&objectType=1');

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    expect(mockedClipboard.addToClipboard).toHaveBeenCalled();
  });

  it('handles admin delete action', async () => {
    renderMenu({ objectName: 'topic', objectType: 1, createUserId: 'other-user', _id: 'topic-9' });

    fireEvent.click(screen.getByRole('button', { name: /actions/i }));
    expect(screen.getByRole('button', { name: /take ownership/i })).toBeInTheDocument();
    const deleteButton = screen.getByText(/delete/i);
    fireEvent.click(deleteButton);
    expect(mockedModerationApi.deleteEntry).toHaveBeenCalledWith('topic-9', 1);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/topics'));
  });

  it('hides editing/moderation actions in reader mode', () => {
    mockUseAuth.mockReturnValue({
      user: {
        _id: 'user-2',
        username: 'reader',
        roles: { admin: 'admin-role-id', screener: true },
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'reader' as const,
      setActiveRole: jest.fn(),
      availableRoles: ['reader' as const, 'contributor' as const, 'admin' as const],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    renderMenu({ objectName: 'topic', _id: 'topic-1' });
    fireEvent.click(screen.getByRole('button', { name: /actions/i }));

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /screening status/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reply/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view history/i })).toBeInTheDocument();
  });
});
