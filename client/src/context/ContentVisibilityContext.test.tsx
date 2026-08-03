import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '../test-utils/render';
import apiService from '../services/api';
import {
  ContentVisibilityProvider,
  useContentVisibility,
} from './ContentVisibilityContext';
import { CONTENT_VISIBILITY_STORAGE_KEY } from '../utils/contentVisibility';

const mockUpdateUser = jest.fn();
let mockUser: {
  _id: string;
  username: string;
  preferences?: { contentVisibility?: 'accepted' | 'active' | 'all' };
} | null = null;

jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    updateUser: mockUpdateUser,
  }),
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    updateCurrentMemberPreferences: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

const Consumer: React.FC = () => {
  const visibility = useContentVisibility();
  return (
    <div>
      <span data-testid="preference">{visibility.preference}</span>
      <span data-testid="effective-view">{visibility.effectiveView}</span>
      <button type="button" onClick={() => { void visibility.setPreference('active').catch(() => undefined); }}>Use active</button>
      <button type="button" onClick={() => { void visibility.setPreference('accepted').catch(() => undefined); }}>Use accepted</button>
    </div>
  );
};

describe('ContentVisibilityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUser = null;
    mockedApi.updateCurrentMemberPreferences.mockResolvedValue({});
  });

  it('uses and updates the browser preference for a guest', async () => {
    localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY, 'active');

    render(<ContentVisibilityProvider><Consumer /></ContentVisibilityProvider>);

    expect(screen.getByTestId('preference')).toHaveTextContent('active');
    expect(screen.getByTestId('effective-view')).toHaveTextContent('active');

    fireEvent.click(screen.getByRole('button', { name: 'Use accepted' }));

    await waitFor(() => expect(screen.getByTestId('effective-view')).toHaveTextContent('wiki'));
    expect(localStorage.getItem(CONTENT_VISIBILITY_STORAGE_KEY)).toBe('accepted');
    expect(mockedApi.updateCurrentMemberPreferences).not.toHaveBeenCalled();
  });

  it('loads and persists the signed-in member preference', async () => {
    mockUser = {
      _id: 'user-1',
      username: 'reader',
      preferences: { contentVisibility: 'all' },
    };

    render(<ContentVisibilityProvider><Consumer /></ContentVisibilityProvider>);

    await waitFor(() => expect(screen.getByTestId('effective-view')).toHaveTextContent('all'));
    fireEvent.click(screen.getByRole('button', { name: 'Use active' }));

    await waitFor(() => {
      expect(mockedApi.updateCurrentMemberPreferences).toHaveBeenCalledWith({ contentVisibility: 'active' });
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      preferences: { contentVisibility: 'active' },
    });
    expect(localStorage.getItem(CONTENT_VISIBILITY_STORAGE_KEY)).toBe('active');
  });

  it('rolls back the member preference when persistence fails', async () => {
    mockUser = {
      _id: 'user-1',
      username: 'reader',
      preferences: { contentVisibility: 'accepted' },
    };
    mockedApi.updateCurrentMemberPreferences.mockRejectedValue(new Error('save failed'));

    render(<ContentVisibilityProvider><Consumer /></ContentVisibilityProvider>);

    await waitFor(() => expect(screen.getByTestId('effective-view')).toHaveTextContent('wiki'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use active' }));
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('effective-view')).toHaveTextContent('wiki'));
    expect(mockUpdateUser).toHaveBeenLastCalledWith({
      preferences: { contentVisibility: 'accepted' },
    });
    expect(localStorage.getItem(CONTENT_VISIBILITY_STORAGE_KEY)).toBe('accepted');
  });
});
