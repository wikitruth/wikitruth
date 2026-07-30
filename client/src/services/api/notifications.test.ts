import notificationsApi, { type NotificationPreferences } from './notifications';

const preferences: NotificationPreferences = {
  inApp: { enabled: true },
  emailDigest: { enabled: true, frequency: 'weekly' },
  webPush: { enabled: false },
};

describe('notificationsApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    document.cookie = '_csrfToken=notification-token; path=/';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads and updates preferences with csrf protection', async () => {
    await notificationsApi.preferences();
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/preferences',
      expect.objectContaining({ credentials: 'include' }),
    );

    await notificationsApi.updatePreferences(preferences);
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/preferences',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ preferences }),
        headers: expect.objectContaining({ 'x-csrf-token': 'notification-token' }),
      }),
    );
  });

  it('filters the delivery outbox and retries an encoded delivery id', async () => {
    await notificationsApi.outbox({ channel: 'email_digest', status: 'queued', limit: 0 });
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/outbox?channel=email_digest&status=queued&limit=0',
      expect.any(Object),
    );

    await notificationsApi.retryDelivery('delivery/a b');
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/outbox/delivery%2Fa%20b/retry',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'notification-token' }),
      }),
    );
  });

  it('serializes notification list filters and reads the summary', async () => {
    await notificationsApi.list({ page: 0, limit: 25, unreadOnly: true });
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications?page=0&limit=25&unreadOnly=1',
      expect.any(Object),
    );

    await notificationsApi.summary();
    expect(global.fetch).toHaveBeenLastCalledWith('/api/notifications/summary', expect.any(Object));
  });

  it('marks one or all notifications read with csrf protection', async () => {
    await notificationsApi.markRead('notice/a b');
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/notice%2Fa%20b/read',
      expect.objectContaining({ method: 'POST' }),
    );

    await notificationsApi.markAllRead();
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/read-all',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'notification-token' }),
      }),
    );
  });

  it('sets and loads encoded entry subscriptions', async () => {
    const payload = {
      objectName: 'topic/branch',
      objectType: 1,
      id: 'entry a/b',
      enabled: true,
      triggers: ['entry.updated'],
    };
    await notificationsApi.setSubscription(payload);
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/subscriptions',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(payload) }),
    );

    await notificationsApi.getSubscription(payload.objectName, payload.id, payload.objectType);
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/notifications/subscriptions/topic%2Fbranch/entry%20a%2Fb?objectType=1',
      expect.any(Object),
    );
  });

  it('uses server failure messages and a status fallback', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Delivery is already processing' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => { throw new Error('not json'); },
      });

    await expect(notificationsApi.retryDelivery('delivery-1'))
      .rejects.toThrow('Delivery is already processing');
    await expect(notificationsApi.preferences())
      .rejects.toThrow('Notification request failed: 502');
  });
});
