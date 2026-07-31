import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import ClipboardPage from './ClipboardPage';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { LegacyEntity } from '../types/legacy';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('../context/AuthPromptContext', () => ({
  useAuthPrompt: () => ({ requestSignIn: jest.fn() }),
}));

jest.mock('../components/common/PageMeta', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../services/api/notifications', () => ({
  __esModule: true,
  default: {
    getSubscription: jest.fn().mockResolvedValue({ subscription: { followed: false } }),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;

describe('Clipboard integration flow', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'user-1',
        username: 'demo',
        roles: {},
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'contributor',
      setActiveRole: jest.fn(),
      availableRoles: ['contributor'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    mockedUseNotification.mockReturnValue({
      addToast: jest.fn(),
      toasts: [],
      removeToast: jest.fn(),
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('copies entry to clipboard and removes it from Clipboard page', async () => {
    const user = userEvent.setup();

    render(
      <EntryActionsMenu
        entry={{
          _id: 'topic-1',
          objectName: 'topic',
          objectType: 1,
          title: 'Climate Change',
          friendlyUrl: 'climate-change',
          createUserId: 'owner-1',
        } as unknown as LegacyEntity}
      />,
      { route: '/topics/entry/climate-change/topic-1' },
    );

    await user.click(await screen.findByRole('link', { name: /more/i }));
    await user.click(screen.getByRole('button', { name: /copy to clipboard/i }));

    render(<ClipboardPage />, { route: '/clipboard' });
    expect(await screen.findByText('Climate Change')).toBeInTheDocument();

    await user.click(screen.getByTitle(/remove/i));
    await waitFor(() => expect(screen.getByText(/your clipboard is empty/i)).toBeInTheDocument());
  });
});
