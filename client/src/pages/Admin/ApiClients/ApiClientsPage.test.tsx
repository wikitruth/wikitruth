import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import ApiClientsPage from './ApiClientsPage';
import apiClientsApi from '../../../services/api/apiClients';

jest.mock('../../../services/api/apiClients', () => ({
  __esModule: true,
  default: { list: jest.fn(), users: jest.fn(), create: jest.fn(), rotate: jest.fn(), revoke: jest.fn() },
}));
jest.mock('../../../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));

const api = apiClientsApi as jest.Mocked<typeof apiClientsApi>;

describe('ApiClientsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.list.mockResolvedValue({ success: true, clients: [] });
    api.users.mockResolvedValue([{ _id: 'user-1', username: 'accountable-user' }]);
    api.create.mockResolvedValue({
      success: true,
      token: 'wt_agent_1234567890abcdef12345678.one-time-secret',
      tokenReturnedOnce: true,
      client: {
        id: 'client-1', clientId: '1234567890abcdef12345678', name: 'Research agent', description: '',
        userId: 'user-1', tokenPrefix: 'wt_agent_prefix', scopes: ['entries:read'], status: 'active',
        expiresAt: null, rateLimitPerMinute: 60, requestCount: 0,
      },
    });
  });

  it('creates a scoped credential and displays its token once', async () => {
    const user = userEvent.setup();
    render(<ApiClientsPage />);
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    await user.type(screen.getByLabelText(/agent name/i), 'Research agent');
    await user.click(screen.getByRole('button', { name: /create agent credential/i }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Research agent', userId: 'user-1', scopes: ['entries:read', 'contributions:write'], rateLimitPerMinute: 60,
    })));
    expect(await screen.findByLabelText(/one-time agent token/i)).toHaveValue('wt_agent_1234567890abcdef12345678.one-time-secret');
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
  });
});
