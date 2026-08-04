import React from 'react';
import userEvent from '@testing-library/user-event';
import SignupPage from './SignupPage';
import { render, screen } from '../../test-utils/render';

const mockNavigate = jest.fn();
const mockSignup = jest.fn();

jest.mock('react-router', () => {
  const actual = jest.requireActual('react-router');
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
      signup: mockSignup,
      isAuthenticated: false,
      refreshAuth: jest.fn(),
    }),
  };
});

jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    providers: jest.fn().mockResolvedValue({ providers: {} }),
    emailCodeConfig: jest.fn().mockResolvedValue({
      enabled: true,
      codeLength: 6,
      expiresInSeconds: 600,
      resendDelaySeconds: 60,
      canonicalOrigin: 'http://localhost',
      isCanonicalOrigin: true,
    }),
  },
}));

jest.mock('../../services/api/passkeys', () => ({
  __esModule: true,
  default: {
    config: jest.fn().mockResolvedValue({ enabled: false, passwordlessEnabled: false }),
    supported: jest.fn().mockReturnValue(false),
  },
}));

describe('Signup flow integration', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSignup.mockReset();
    mockSignup.mockResolvedValue(undefined);
  });

  it('submits signup fields and redirects to home', async () => {
    const user = userEvent.setup();

    render(<SignupPage />, { route: '/signup' });

    expect(screen.getByRole('heading', { level: 1, name: /create your wikitruth account/i })).toBeVisible();
    const firstEmailInput = await screen.findByLabelText(/^email/i);
    expect(screen.queryByLabelText(/^username$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/^email/i)).toHaveLength(1);

    await user.type(firstEmailInput, 'newuser@example.com');
    await user.click(screen.getByRole('button', { name: /use password instead/i }));

    await user.type(screen.getByLabelText(/username/i), 'newuser');
    expect(screen.getByLabelText(/^email/i)).toHaveValue('newuser@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'secret12');
    await user.type(screen.getByLabelText(/confirm password/i), 'secret12');
    await user.click(screen.getByLabelText(/i agree to the terms/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockSignup).toHaveBeenCalledWith('newuser', 'newuser@example.com', 'secret12', undefined, true);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
