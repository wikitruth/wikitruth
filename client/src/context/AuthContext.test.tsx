import React from 'react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { render, screen, waitFor } from '../test-utils/render';

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
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('loads auth status and supports login/logout', async () => {
    const user = userEvent.setup();

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { _id: '1', username: 'demo' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

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
  });
});
