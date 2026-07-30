import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import { useAuth } from '../context/AuthContext';
import authApi from '../services/api/auth';
import LoginPage from './LoginPage';

const navigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api/auth', () => ({
  __esModule: true,
  default: {
    providers: jest.fn(),
    emailCodeConfig: jest.fn(),
  },
}));

jest.mock('../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('LoginPage', () => {
  const login = jest.fn();

  beforeEach(() => {
    navigate.mockReset();
    login.mockReset();
    login.mockResolvedValue(undefined);
    mockedAuthApi.providers.mockResolvedValue({ success: true, providers: {} });
    mockedAuthApi.emailCodeConfig.mockResolvedValue({
      enabled: false,
      codeLength: 6,
      expiresInSeconds: 600,
      resendDelaySeconds: 60,
      canonicalOrigin: 'http://localhost',
      isCanonicalOrigin: true,
    });
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader'],
      login,
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
  });

  it('remembers the device and returns to the protected page', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { route: '/login?returnUrl=%2Fnotifications%3Fview%3Dunread' });

    expect(screen.getByRole('checkbox', { name: /keep me signed in/i })).toBeChecked();
    await user.type(screen.getByLabelText(/username or email/i), 'demo');
    await user.type(screen.getByLabelText(/^password/i), 'secret12');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('demo', 'secret12', true));
    expect(navigate).toHaveBeenCalledWith('/notifications?view=unread', { replace: true });
  });

  it('rejects an external return URL', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { route: '/login?returnUrl=https%3A%2F%2Fevil.example' });

    await user.type(screen.getByLabelText(/username or email/i), 'demo');
    await user.type(screen.getByLabelText(/^password/i), 'secret12');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });
});
