import React from 'react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { render, screen, waitFor } from '../test-utils/render';
import authApi from '../services/api/auth';

jest.mock('../services/api/auth', () => ({
  __esModule: true,
  default: {
    me: jest.fn(),
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
  },
}));

const TestComponent: React.FC = () => {
  const { user, isLoading, login, logout } = useAuth();

  return (
    <>
      <p>{isLoading ? 'loading' : user?.username || 'guest'}</p>
      <button type="button" onClick={() => login('demo', 'secret12')}>
        Login
      </button>
      <button type="button" onClick={() => logout()}>
        Logout
      </button>
    </>
  );
};

describe('AuthContext', () => {
  const authApiMock = authApi as jest.Mocked<typeof authApi>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    authApiMock.me.mockReset();
    authApiMock.login.mockReset();
    authApiMock.signup.mockReset();
    authApiMock.logout.mockReset();
    consoleErrorSpy.mockRestore();
  });

  it('loads auth status and supports login/logout', async () => {
    const user = userEvent.setup();

    authApiMock.me.mockRejectedValueOnce(new Error('Not authenticated'));
    authApiMock.login.mockResolvedValueOnce({ user: { _id: '1', username: 'demo' } as any });
    authApiMock.logout.mockResolvedValueOnce({} as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('guest')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(screen.getByText('demo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => expect(screen.getByText('guest')).toBeInTheDocument());

    expect(authApiMock.me).toHaveBeenCalledTimes(1);
    expect(authApiMock.login).toHaveBeenCalledWith({ username: 'demo', password: 'secret12' });
    expect(authApiMock.logout).toHaveBeenCalledTimes(1);
  });
});
