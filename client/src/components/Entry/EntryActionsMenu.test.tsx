import React from 'react';
import EntryActionsMenu from './EntryActionsMenu';
import { act, fireEvent, render, screen, waitFor } from '../../test-utils/render';
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

async function renderMenu(entry: Partial<LegacyEntity>) {
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
  await act(async () => {
    await Promise.resolve();
  });
}

function openMenu() {
  fireEvent.click(screen.getByRole('link', { name: /more/i }));
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

  it('routes screening action through modern screening route', async () => {
    await renderMenu({ objectName: 'topic', _id: 'topic-1' });

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /screening status/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/screening?topic=topic-1');
  });

  it('routes convert action through modern convert route', async () => {
    await renderMenu({ objectName: 'argument', objectType: 2, _id: 'arg-1' });

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /convert/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/convert?argument=arg-1');
  });

  it('hides screening and convert for non-moderators', async () => {
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

    await renderMenu({ objectName: 'topic', _id: 'topic-1' });
    openMenu();

    expect(screen.queryByRole('button', { name: /screening status/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /convert/i })).not.toBeInTheDocument();
  });

  it('routes reply/link/report/details/history and clipboard actions', async () => {
    await renderMenu({ objectName: 'topic', _id: 'topic-1', title: 'Topic A', friendlyUrl: 'topic-a' });

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/opinions/create?parentId=topic-1&parentType=topic');

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /link to/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/outline/link?parentId=topic-1&parentTitle=Topic%20A');

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /report/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/issues/create?topic=topic-1');

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/topics/entry/topic-a/topic-1');

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    expect(mockedClipboard.addToClipboard).toHaveBeenCalled();
  });

  it('handles admin delete action', async () => {
    await renderMenu({ objectName: 'topic', objectType: 1, createUserId: 'other-user', _id: 'topic-9' });

    openMenu();
    expect(screen.getByRole('button', { name: /take ownership/i })).toBeInTheDocument();
    const deleteButton = screen.getByText(/delete/i);
    fireEvent.click(deleteButton);
    expect(mockedModerationApi.deleteEntry).toHaveBeenCalledWith('topic-9', 1);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/topics'));
  });

  it('keeps reader mode non-destructive while preserving follow/report parity actions', async () => {
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

    await renderMenu({ objectName: 'topic', _id: 'topic-1' });
    openMenu();

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /screening status/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reply/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signal for review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit appeal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
  });

  it('does not leak assigned admin capabilities into contributor mode', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        _id: 'admin-user',
        username: 'admin',
        roles: { admin: 'admin-role-id', screener: true },
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'contributor' as const,
      setActiveRole: jest.fn(),
      availableRoles: ['reader' as const, 'contributor' as const, 'screener' as const, 'admin' as const],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    await renderMenu({ objectName: 'topic', objectType: 1, createUserId: 'other-user', _id: 'topic-1' });
    openMenu();

    expect(screen.queryByRole('button', { name: /screening status/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /take ownership/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /convert/i })).not.toBeInTheDocument();
  });
});
