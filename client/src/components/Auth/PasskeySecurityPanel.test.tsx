import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test-utils/render';
import PasskeySecurityPanel from './PasskeySecurityPanel';
import passkeyApi, { type PasskeyState } from '../../services/api/passkeys';

const refreshAuth = jest.fn();
const recentTimestamp = () => new Date().toISOString();

const credential = {
  id: 'passkey-1',
  credentialId: 'credential-1',
  name: 'Phone',
  transports: ['internal'],
  deviceType: 'multiDevice',
  backedUp: true,
  status: 'active',
  createDate: '2026-07-20T10:00:00.000Z',
  lastUsedAt: null,
  revokedAt: null,
};

const createState = (overrides: Partial<PasskeyState> = {}): PasskeyState => ({
  credentials: [credential],
  recovery: { configured: false, unusedCount: 0, createdAt: null },
  passwordLoginDisabled: false,
  assurance: {
    method: 'passkey',
    authenticatedAt: recentTimestamp(),
    passkeyVerifiedAt: recentTimestamp(),
    passkeyCredentialId: credential.id,
  },
  ...overrides,
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'admin-1', username: 'admin', roles: { admin: 'yes' } },
    refreshAuth,
  }),
}));

jest.mock('../../services/api/passkeys', () => ({
  __esModule: true,
  default: {
    config: jest.fn(),
    state: jest.fn(),
    supported: jest.fn(() => true),
    register: jest.fn(),
    rename: jest.fn(),
    revoke: jest.fn(),
    authenticate: jest.fn(),
    generateRecoveryCodes: jest.fn(),
    setPasswordLogin: jest.fn(),
  },
}));

describe('PasskeySecurityPanel', () => {
  const api = passkeyApi as jest.Mocked<typeof passkeyApi>;

  beforeEach(() => {
    jest.clearAllMocks();
    api.config.mockResolvedValue({
      enabled: true,
      rpName: 'Wikitruth',
      canonicalOrigin: 'https://wikitruth.net',
      isCanonicalOrigin: true,
      passwordlessEnabled: true,
      adminStepUpRequired: true,
      stepUpMaxAgeSeconds: 600,
    });
    api.state.mockResolvedValue(createState());
    api.register.mockResolvedValue({} as never);
    api.authenticate.mockResolvedValue({} as never);
    api.generateRecoveryCodes.mockResolvedValue({
      success: true,
      codes: ['RECOVERY-ONE', 'RECOVERY-TWO'],
      returnedOnce: true,
    });
    refreshAuth.mockResolvedValue(undefined);
  });

  it('shows administrator readiness and registers another passkey', async () => {
    const user = userEvent.setup();
    render(<PasskeySecurityPanel />);

    expect(await screen.findByText(/administrator actions require/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add passkey/i }));

    await waitFor(() => expect(api.register).toHaveBeenCalledWith('My passkey'));
    expect(refreshAuth).toHaveBeenCalled();
  });

  it('sends tenant users to the canonical passkey settings page', async () => {
    api.config.mockResolvedValueOnce({
      enabled: true,
      rpName: 'Wikitruth',
      canonicalOrigin: 'https://wikitruth.net',
      isCanonicalOrigin: false,
      passwordlessEnabled: true,
      adminStepUpRequired: true,
      stepUpMaxAgeSeconds: 600,
    });

    render(<PasskeySecurityPanel />);

    expect(await screen.findByRole('link', { name: /manage passkeys on wikitruth/i })).toHaveAttribute(
      'href',
      'https://wikitruth.net/account/settings#passkeys'
    );
    expect(api.state).not.toHaveBeenCalled();
  });

  it('requires and completes passkey step-up before credential management', async () => {
    const user = userEvent.setup();
    api.state
      .mockResolvedValueOnce(createState({
        assurance: { method: 'password', authenticatedAt: recentTimestamp() },
      }))
      .mockResolvedValueOnce(createState());

    render(<PasskeySecurityPanel />);

    expect(await screen.findByRole('button', { name: /add passkey/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /confirm with passkey/i }));

    await waitFor(() => expect(api.authenticate).toHaveBeenCalledWith('step_up'));
    await waitFor(() => expect(screen.getByRole('button', { name: /add passkey/i })).toBeEnabled());
    expect(refreshAuth).toHaveBeenCalled();
  });

  it('allows recovery sessions to add a replacement while keeping sensitive actions locked', async () => {
    api.state.mockResolvedValueOnce(createState({
      assurance: {
        method: 'recovery_code',
        authenticatedAt: recentTimestamp(),
        recoveredAt: recentTimestamp(),
      },
    }));

    render(<PasskeySecurityPanel />);

    expect(await screen.findByText(/recovery session can add a replacement/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add passkey/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /revoke/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /generate new recovery codes/i })).toBeDisabled();
  });

  it('protects the administrator minimum passkey set', async () => {
    render(<PasskeySecurityPanel />);

    const revoke = await screen.findByRole('button', { name: /revoke/i });
    expect(revoke).toBeDisabled();
    expect(revoke).toHaveAttribute('title', 'Keep at least two active passkeys for this account.');
  });

  it('requires a different passkey before revoking the assurance credential', async () => {
    api.state.mockResolvedValueOnce(createState({
      credentials: [
        credential,
        { ...credential, id: 'passkey-2', credentialId: 'credential-2', name: 'Laptop' },
        { ...credential, id: 'passkey-3', credentialId: 'credential-3', name: 'Security key' },
      ],
    }));

    render(<PasskeySecurityPanel />);

    const revokeButtons = await screen.findAllByRole('button', { name: /revoke/i });
    expect(revokeButtons[0]).toBeDisabled();
    expect(revokeButtons[0]).toHaveAttribute(
      'title',
      'Confirm with another passkey before revoking this one.',
    );
    expect(revokeButtons[1]).toBeEnabled();
    expect(revokeButtons[2]).toBeEnabled();
  });

  it('shows newly generated recovery codes only after a successful request', async () => {
    const user = userEvent.setup();
    render(<PasskeySecurityPanel />);

    await user.click(await screen.findByRole('button', { name: /generate new recovery codes/i }));

    expect(await screen.findByText(/RECOVERY-ONE/)).toBeInTheDocument();
    expect(screen.getByText(/they will not be shown again/i)).toBeInTheDocument();
  });

  it('recovers from an initial settings request failure', async () => {
    const user = userEvent.setup();
    api.config.mockRejectedValueOnce(new Error('Passkey settings are temporarily unavailable'));

    render(<PasskeySecurityPanel />);

    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText(/administrator actions require/i)).toBeInTheDocument();
    expect(api.config).toHaveBeenCalledTimes(2);
  });

  it('keeps controls usable after a registration request failure', async () => {
    const user = userEvent.setup();
    api.register.mockRejectedValueOnce(new Error('Authenticator cancelled'));
    render(<PasskeySecurityPanel />);

    await user.click(await screen.findByRole('button', { name: /add passkey/i }));

    expect(await screen.findByText('Authenticator cancelled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add passkey/i })).toBeEnabled();
  });
});
