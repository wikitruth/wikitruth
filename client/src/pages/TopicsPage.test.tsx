import React from 'react';
import { render, screen, waitFor } from '../test-utils/render';
import userEvent from '@testing-library/user-event';
import TopicsPage from './TopicsPage';
import apiService from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

jest.mock('../components/common/PageMeta', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getTopics: jest.fn(),
  },
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const mockedUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('TopicsPage content view filter', () => {
  beforeEach(() => {
    mockedUseNotification.mockReturnValue({
      addToast: jest.fn(),
      removeToast: jest.fn(),
      toasts: [],
    });
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    mockedApi.getTopics.mockResolvedValue({
      topics: [{ _id: 't1', title: 'Topic 1', description: 'Desc' }],
      topic: null,
    } as never);
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('loads with the default view and refetches when view filter changes', async () => {
    const user = userEvent.setup();
    render(<TopicsPage />, { route: '/topics' });

    await waitFor(() => expect(mockedApi.getTopics).toHaveBeenCalledWith(undefined, 'all'));

    await user.click(await screen.findByRole('button', { name: /wiki/i }));
    await waitFor(() => expect(mockedApi.getTopics).toHaveBeenLastCalledWith(undefined, 'wiki'));
    expect(localStorage.getItem('wt_view_mode')).toBe('wiki');

    await user.click(screen.getByRole('button', { name: /original/i }));
    await waitFor(() => expect(mockedApi.getTopics).toHaveBeenLastCalledWith(undefined, 'original'));
    expect(localStorage.getItem('wt_view_mode')).toBe('original');
  });
});
