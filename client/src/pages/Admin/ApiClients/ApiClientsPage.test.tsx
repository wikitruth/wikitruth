import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import ApiClientsPage from './ApiClientsPage';
import apiClientsApi from '../../../services/api/apiClients';

jest.mock('../../../services/api/apiClients', () => ({
  __esModule: true,
  default: { list: jest.fn(), usage: jest.fn(), users: jest.fn(), create: jest.fn(), rotate: jest.fn(), revoke: jest.fn() },
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
        policy: { tenantIds: [], entryTypes: ['topic'], parentRootIds: [], ownContentOnly: true, maxVisibility: 'public_only', sourceRequired: false, maxBatchSize: 25 },
        expiresAt: null, rateLimitPerMinute: 60, requestCount: 0,
      },
    });
    api.usage.mockResolvedValue({
      success: true,
      client: { id: 'client-1', name: 'Research agent' },
      period: { days: 30, from: '2026-07-23T00:00:00.000Z', to: '2026-08-22T00:00:00.000Z' },
      usage: { requests: 42, rateLimitedRequests: 3, peakRequestsPerMinute: 18, activeMinutes: 8 },
      events: { request_denied: 2, idempotent_replay: 1 },
      jobs: { completed: 4 },
      advice: { countersigned: 1, rejected: 2 },
    });
  });

  it('creates a scoped credential and displays its token once', async () => {
    const user = userEvent.setup();
    render(<ApiClientsPage />);
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    await user.type(screen.getByLabelText(/agent name/i), 'Research agent');
    await user.click(screen.getByRole('button', { name: /create agent credential/i }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Research agent', userId: 'user-1', scopes: ['entries:read', 'entries:create'], rateLimitPerMinute: 60,
      policy: expect.objectContaining({ ownContentOnly: true, maxVisibility: 'public_only', maxBatchSize: 25 }),
    })));
    expect(await screen.findByLabelText(/one-time agent token/i)).toHaveValue('wt_agent_1234567890abcdef12345678.one-time-secret');
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
  });

  it('shows aggregate usage and governance outcomes without exposing request content', async () => {
    api.list.mockResolvedValue({ success: true, clients: [{
      id: 'client-1', clientId: '1234567890abcdef12345678', name: 'Research agent', description: '',
      userId: 'user-1', tokenPrefix: 'wt_agent_prefix', scopes: ['entries:read'], status: 'active',
      policy: { tenantIds: [], entryTypes: ['topic'], parentRootIds: [], ownContentOnly: true, maxVisibility: 'public_only', sourceRequired: false, maxBatchSize: 25 },
      expiresAt: null, rateLimitPerMinute: 60, requestCount: 42,
    }] });
    const user = userEvent.setup();
    render(<ApiClientsPage />);
    expect(await screen.findByRole('table')).toHaveClass('responsive');
    const credentialRow = screen.getByText('Research agent').closest('tr');
    expect(credentialRow?.querySelector('td[data-label="Agent"]')).toBeInTheDocument();
    expect(credentialRow?.querySelector('td[data-label="Accountable user"]')).toHaveTextContent('user-1');
    await user.click(await screen.findByRole('button', { name: 'Usage' }));
    expect(await screen.findByRole('heading', { name: /research agent usage/i })).toBeInTheDocument();
    expect(screen.getByText('Rate limited')).toBeInTheDocument();
    expect(screen.getByText('Request denied: 2')).toBeInTheDocument();
    expect(api.usage).toHaveBeenCalledWith('client-1');
  });
});
