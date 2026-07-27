import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import notificationsApi from '../services/api/notifications';
import NotificationsPage from './NotificationsPage';

jest.mock('../services/api/notifications', () => ({
  __esModule: true,
  default: { list: jest.fn(), outbox: jest.fn(), retryDelivery: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() },
}));
jest.mock('../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));

const mockedApi = notificationsApi as jest.Mocked<typeof notificationsApi>;

describe('NotificationsPage delivery status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.list.mockResolvedValue({ success: true, notifications: [], total: 0, unreadCount: 0, page: 1, limit: 100 });
    mockedApi.outbox.mockResolvedValue({ success: true, deliveries: [{ _id: 'delivery-1', channel: 'web_push', status: 'failed', lastError: 'adapter unavailable' }] });
    mockedApi.retryDelivery.mockResolvedValue({ success: true, delivery: { _id: 'delivery-1', channel: 'web_push', status: 'queued' } });
  });

  it('shows honest delivery state and retries failed work', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);
    expect(await screen.findByText('web push')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mockedApi.retryDelivery).toHaveBeenCalledWith('delivery-1'));
    expect(screen.getByText('queued')).toBeInTheDocument();
  });
});
