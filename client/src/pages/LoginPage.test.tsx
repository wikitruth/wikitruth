import React from 'react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from '../test-utils/render';
import { useAuth } from '../context/AuthContext';
import authApi from '../services/api/auth';
import LoginPage from './LoginPage';

const navigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => navigate,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api/auth', () => ({
  __esModule: true,
  default: {
    config: jest.fn(),
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
    mockedAuthApi.config.mockResolvedValue({
      success: true,
      providers: {},
      fastSwitchAvailable: false,
      emailCode: {
        enabled: false,
        codeLength: 6,
        expiresInSeconds: 600,
        resendDelaySeconds: 60,
        canonicalOrigin: 'http://localhost',
        isCanonicalOrigin: true,
      },
      passkeys: {
        enabled: false,
        rpName: 'Wikitruth',
        canonicalOrigin: 'http://localhost',
        isCanonicalOrigin: true,
        passwordlessEnabled: false,
        adminStepUpRequired: false,
        stepUpMaxAgeSeconds: 600,
      },
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
    await user.type(await screen.findByLabelText(/username or email/i), 'demo');
    await user.type(await screen.findByPlaceholderText('Enter your password'), 'secret12');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('demo', 'secret12', true));
    expect(navigate).toHaveBeenCalledWith('/notifications?view=unread', { replace: true });
  });

  it('explains why sign in is needed and confirms the return flow', async () => {
    render(<LoginPage />, {
      route: '/login?returnUrl=%2Fnotifications%3Fview%3Dunread&intent=protected',
    });

    expect(screen.getByRole('heading', { name: 'Sign in to view your notifications' })).toBeInTheDocument();
    expect(screen.getByText(/return to the page you requested/i)).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('rejects an external return URL', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { route: '/login?returnUrl=https%3A%2F%2Fevil.example' });

    await user.type(await screen.findByLabelText(/username or email/i), 'demo');
    await user.type(await screen.findByPlaceholderText('Enter your password'), 'secret12');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
    expect(screen.queryByText(/after signing in/i)).not.toBeInTheDocument();
  });

  it('prioritizes email sign-in and keeps password sign-in collapsed', async () => {
    mockedAuthApi.config.mockResolvedValueOnce({
      success: true,
      providers: {},
      fastSwitchAvailable: false,
      emailCode: {
        enabled: true,
        codeLength: 6,
        expiresInSeconds: 600,
        resendDelaySeconds: 60,
        canonicalOrigin: 'http://localhost',
        isCanonicalOrigin: true,
      },
      passkeys: {
        enabled: false,
        rpName: 'Wikitruth',
        canonicalOrigin: 'http://localhost',
        isCanonicalOrigin: true,
        passwordlessEnabled: false,
        adminStepUpRequired: false,
        stepUpMaxAgeSeconds: 600,
      },
    });

    const user = userEvent.setup();
    render(<LoginPage />, { route: '/login' });

    expect(await screen.findByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter your password')).not.toBeInTheDocument();
    expect(screen.queryByText(/social sign-in is currently unavailable/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /use password instead/i }));
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('keeps password available and retries when capability loading fails', async () => {
    mockedAuthApi.config
      .mockRejectedValueOnce(new Error('Auth request failed: 404'))
      .mockResolvedValueOnce({
        success: true,
        providers: {},
        fastSwitchAvailable: false,
        emailCode: {
          enabled: true,
          codeLength: 6,
          expiresInSeconds: 600,
          resendDelaySeconds: 60,
          canonicalOrigin: 'http://localhost',
          isCanonicalOrigin: true,
        },
        passkeys: {
          enabled: false,
          rpName: 'Wikitruth',
          canonicalOrigin: 'http://localhost',
          isCanonicalOrigin: true,
          passwordlessEnabled: false,
          adminStepUpRequired: false,
          stepUpMaxAgeSeconds: 600,
        },
      });
    const user = userEvent.setup();
    render(<LoginPage />, { route: '/login' });

    expect(await screen.findByText(/some sign-in options could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry sign-in options/i }));

    expect(await screen.findByLabelText(/^email/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument());
  });

  it('has no obvious accessibility violations in the primary sign-in state', async () => {
    const { container } = render(<LoginPage />, { route: '/login' });

    await screen.findByPlaceholderText('Enter your password');
    expect(await axe(container)).toHaveNoViolations();
  });
});
