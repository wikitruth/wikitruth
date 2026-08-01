import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test-utils/render';
import PasswordlessEmailPanel from './PasswordlessEmailPanel';
import authApi from '../../services/api/auth';

const refreshAuth = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ refreshAuth }),
}));

jest.mock('../../hooks/useRecaptcha', () => ({
  __esModule: true,
  default: () => ({ execute: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    emailCodeConfig: jest.fn(),
    requestEmailCode: jest.fn(),
    verifyEmailCode: jest.fn(),
    completeEmailCodeSignup: jest.fn(),
  },
}));

describe('PasswordlessEmailPanel', () => {
  const api = authApi as jest.Mocked<typeof authApi>;

  beforeEach(() => {
    jest.clearAllMocks();
    api.emailCodeConfig.mockResolvedValue({
      enabled: true,
      codeLength: 6,
      expiresInSeconds: 600,
      resendDelaySeconds: 60,
      canonicalOrigin: 'http://localhost',
      isCanonicalOrigin: true,
    });
    api.requestEmailCode.mockResolvedValue({
      success: true,
      message: 'If this address can receive sign-in email, a one-time code has been sent.',
      challengeId: 'challenge-1',
      retryAfterSeconds: 60,
      expiresInSeconds: 600,
      debug: { code: '123456', signInLink: '', emailSent: false },
    });
    refreshAuth.mockResolvedValue(undefined);
  });

  it('requests and verifies a code for an existing account', async () => {
    const user = userEvent.setup();
    const authenticated = jest.fn();
    api.verifyEmailCode.mockResolvedValue({
      success: true,
      user: { _id: 'user-1', username: 'person' } as never,
      activeRole: 'contributor',
    });
    render(
      <PasswordlessEmailPanel rememberMe returnUrl="/explore" onAuthenticated={authenticated} />,
      { route: '/login' },
    );

    await user.type(await screen.findByLabelText(/^email/i), 'Person@Example.com');
    await user.click(screen.getByRole('button', { name: /email me a sign-in code/i }));

    expect(api.requestEmailCode).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com',
      rememberMe: true,
      returnPath: '/explore',
    }));
    await user.type(await screen.findByLabelText(/six-digit code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and continue/i }));

    await waitFor(() => expect(api.verifyEmailCode).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      code: '123456',
    }));
    expect(refreshAuth).toHaveBeenCalled();
    expect(authenticated).toHaveBeenCalled();
  });

  it('collects username and terms only after verifying a new email', async () => {
    const user = userEvent.setup();
    const authenticated = jest.fn();
    api.verifyEmailCode.mockResolvedValue({
      success: true,
      user: null,
      requiresUsername: true,
      challengeId: 'challenge-1',
      completionToken: 'completion-token',
    });
    api.completeEmailCodeSignup.mockResolvedValue({
      success: true,
      created: true,
      user: { _id: 'user-2', username: 'new_person' } as never,
      activeRole: 'reader',
    });
    render(
      <PasswordlessEmailPanel rememberMe={false} returnUrl="/" mode="signup" onAuthenticated={authenticated} />,
      { route: '/signup' },
    );

    await user.type(await screen.findByLabelText(/^email/i), 'new@example.com');
    await user.click(screen.getByRole('button', { name: /email me a sign-in code/i }));
    await user.type(await screen.findByLabelText(/six-digit code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and continue/i }));
    await user.type(await screen.findByLabelText(/username/i), 'new_person');
    await user.click(screen.getByRole('checkbox', { name: /responsible participation/i }));
    await user.click(screen.getByRole('button', { name: /create account and continue/i }));

    await waitFor(() => expect(api.completeEmailCodeSignup).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      completionToken: 'completion-token',
      username: 'new_person',
      agreeToTerms: true,
    }));
    expect(authenticated).toHaveBeenCalled();
  });

  it('preserves the originating tenant during email signup', async () => {
    const user = userEvent.setup();
    render(
      <PasswordlessEmailPanel rememberMe returnUrl="/civic/projects" mode="signup" onAuthenticated={jest.fn()} />,
      { route: '/signup?tenantOrigin=https%3A%2F%2Ffixph.localhost' },
    );

    await user.type(await screen.findByLabelText(/^email/i), 'tenant@example.com');
    await user.click(screen.getByRole('button', { name: /email me a sign-in code/i }));

    expect(api.requestEmailCode).toHaveBeenCalledWith(expect.objectContaining({
      targetOrigin: 'https://fixph.localhost',
      returnPath: '/civic/projects',
    }));
  });

  it('redirects a tenant to the canonical identity origin', async () => {
    api.emailCodeConfig.mockResolvedValueOnce({
      enabled: true,
      codeLength: 6,
      expiresInSeconds: 600,
      resendDelaySeconds: 60,
      canonicalOrigin: 'https://wikitruth.net',
      isCanonicalOrigin: false,
    });
    render(
      <PasswordlessEmailPanel rememberMe returnUrl="/civic/projects" onAuthenticated={jest.fn()} />,
      { route: '/login' },
    );

    const link = await screen.findByRole('link', { name: /continue with email on wikitruth/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wikitruth.net/login'));
    expect(link).toHaveAttribute('href', expect.stringContaining('returnUrl=%2Fcivic%2Fprojects'));
  });

  it('supports a plain, controlled presentation for focused auth screens', async () => {
    const user = userEvent.setup();
    const onEmailValueChange = jest.fn();
    const onStageChange = jest.fn();
    const { container } = render(
      <PasswordlessEmailPanel
        rememberMe
        returnUrl="/"
        onAuthenticated={jest.fn()}
        runtimeConfig={{
          enabled: true,
          codeLength: 6,
          expiresInSeconds: 600,
          resendDelaySeconds: 60,
          canonicalOrigin: 'http://localhost',
          isCanonicalOrigin: true,
        }}
        presentation="plain"
        requestLabel="Continue with email"
        description={null}
        emailValue="person@example.com"
        onEmailValueChange={onEmailValueChange}
        onStageChange={onStageChange}
      />,
      { route: '/login' },
    );

    const emailInput = screen.getByLabelText(/^email/i);
    expect(emailInput).toHaveValue('person@example.com');
    expect(screen.getByRole('button', { name: /continue with email/i })).toBeVisible();
    expect(container.querySelector('.wt-email-auth-panel-plain')).toBeInTheDocument();
    expect(container.querySelector('.panel-heading')).not.toBeInTheDocument();
    await user.type(emailInput, 'x');
    expect(onEmailValueChange).toHaveBeenCalledWith('person@example.comx');
    await waitFor(() => expect(onStageChange).toHaveBeenCalledWith('request'));
  });
});
