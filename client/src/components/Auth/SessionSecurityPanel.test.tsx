import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test-utils/render';
import SessionSecurityPanel from './SessionSecurityPanel';
import authApi from '../../services/api/auth';

jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    sessions: jest.fn(),
    revokeSession: jest.fn(),
    revokeOtherSessions: jest.fn(),
  },
}));

describe('SessionSecurityPanel', () => {
  const api = authApi as jest.Mocked<typeof authApi>;
  const sessions = [
    {
      id: 'current', current: true, remembered: true, authenticationMethod: 'email_code',
      device: 'Safari on Mac', userAgent: '', ipAddress: '127.0.0.1',
      createdAt: '2026-07-30T00:00:00.000Z', lastActivityAt: '2026-07-30T01:00:00.000Z', expiresAt: '2026-08-29T00:00:00.000Z',
    },
    {
      id: 'other', current: false, remembered: false, authenticationMethod: 'passkey',
      device: 'Chrome on Android', userAgent: '', ipAddress: '192.0.2.1',
      createdAt: '2026-07-29T00:00:00.000Z', lastActivityAt: '2026-07-29T01:00:00.000Z', expiresAt: '2026-07-31T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    api.sessions.mockResolvedValue({ success: true, sessions });
    api.revokeSession.mockResolvedValue({ success: true, message: 'Session revoked' });
    api.revokeOtherSessions.mockResolvedValue({ success: true, revoked: 1 });
  });

  it('identifies the current session and revokes another browser', async () => {
    const user = userEvent.setup();
    render(<SessionSecurityPanel />);

    expect(await screen.findByText('Safari on Mac')).toBeInTheDocument();
    expect(screen.getByText('Current session')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^revoke$/i }));

    await waitFor(() => expect(api.revokeSession).toHaveBeenCalledWith('other'));
    expect(await screen.findByText('Session revoked.')).toBeInTheDocument();
  });

  it('can revoke every other active session at once', async () => {
    const user = userEvent.setup();
    render(<SessionSecurityPanel />);

    await user.click(await screen.findByRole('button', { name: /revoke all other sessions/i }));
    await waitFor(() => expect(api.revokeOtherSessions).toHaveBeenCalled());
    expect(await screen.findByText('One other session revoked.')).toBeInTheDocument();
  });
});
