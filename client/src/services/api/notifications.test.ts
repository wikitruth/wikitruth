import notificationsApi from './notifications';

describe('notifications api preferences and delivery outbox', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    document.cookie = '_csrfToken=notification-token; path=/';
  });

  it('updates channel preferences with csrf protection', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, preferences: {} }) });
    await notificationsApi.updatePreferences({
      inApp: { enabled: true }, emailDigest: { enabled: true, frequency: 'weekly' }, webPush: { enabled: false },
    });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/notifications/preferences'), expect.objectContaining({
      method: 'PUT', headers: expect.objectContaining({ 'x-csrf-token': 'notification-token' }),
    }));
  });

  it('filters the user-owned delivery outbox', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, deliveries: [] }) });
    await notificationsApi.outbox({ channel: 'email_digest', status: 'queued', limit: 10 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/outbox?channel=email_digest&status=queued&limit=10'),
      expect.any(Object),
    );
  });
});
