import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '../../../test-utils/render';
import ProfileJournal from './ProfileJournal';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    getMemberJournal: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function renderJournal(route = '/members/alice/journal') {
  return render(
    <Routes>
      <Route path="/members/:username/journal" element={<ProfileJournal />} />
    </Routes>,
    { route },
  );
}

function mockAuth(user: ReturnType<typeof useAuth>['user']) {
  mockedUseAuth.mockReturnValue({
    user,
    isAuthenticated: Boolean(user),
    isLoading: false,
    activeRole: user?.roles?.admin ? 'admin' : 'contributor',
    setActiveRole: jest.fn(),
    availableRoles: user?.roles?.admin ? ['reader', 'contributor', 'admin'] : ['reader', 'contributor'],
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  });
}

describe('ProfileJournal', () => {
  beforeEach(() => {
    mockedApi.getMemberJournal.mockReset();
  });

  it('shows the private state without making an anonymous journal request', async () => {
    mockAuth(null);

    renderJournal();

    expect(await screen.findByText(/this journal is private/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?returnUrl=%2Fmembers%2Falice%2Fjournal',
    );
    expect(mockedApi.getMemberJournal).not.toHaveBeenCalled();
  });

  it('loads a journal for its owner', async () => {
    mockAuth({ _id: 'user-1', username: 'alice', roles: {} });
    mockedApi.getMemberJournal.mockResolvedValue({ results: false });

    renderJournal();

    await waitFor(() => expect(mockedApi.getMemberJournal).toHaveBeenCalledWith('alice', 'all'));
    expect(await screen.findByText(/no journal entries found/i)).toBeInTheDocument();
  });

  it('allows an administrator to inspect another member journal', async () => {
    mockAuth({ _id: 'admin-1', username: 'admin', roles: { admin: 'admin-role' } });
    mockedApi.getMemberJournal.mockResolvedValue({ results: false });

    renderJournal();

    await waitFor(() => expect(mockedApi.getMemberJournal).toHaveBeenCalledWith('alice', 'all'));
  });
});
