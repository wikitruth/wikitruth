import React from 'react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { render, screen } from '../../test-utils/render';

const mockNavigate = jest.fn();
const mockLogin = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../context/AuthContext', () => {
  const actual = jest.requireActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
    }),
  };
});

jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    config: jest.fn().mockResolvedValue({
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
    }),
  },
}));

describe('Login flow integration', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockLogin.mockResolvedValue(undefined);
  });

  it('submits credentials and redirects to home', async () => {
    const user = userEvent.setup();

    render(<LoginPage />, { route: '/login' });

    await user.type(await screen.findByLabelText(/username or email/i), 'demo-user');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'secret12');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith('demo-user', 'secret12', true);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
