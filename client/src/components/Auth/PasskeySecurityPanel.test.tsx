import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test-utils/render';
import PasskeySecurityPanel from './PasskeySecurityPanel';
import passkeyApi from '../../services/api/passkeys';

const refreshAuth = jest.fn();

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
    api.state.mockResolvedValue({
      credentials: [{
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
      }],
      recovery: { configured: false, unusedCount: 0, createdAt: null },
      passwordLoginDisabled: false,
    });
    api.register.mockResolvedValue({} as never);
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
});
