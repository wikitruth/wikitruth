'use strict';

const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockInsertMany = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: { models: {
    User: { findById: (...args) => mockFindById(...args), findByIdAndUpdate: (...args) => mockFindByIdAndUpdate(...args) },
    NotificationOutbox: { insertMany: (...args) => mockInsertMany(...args) },
  } },
}));

function selected(value) {
  return { select: () => ({ lean: async () => value }) };
}

describe('notification delivery preferences and outbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockReturnValue(selected({ preferences: {} }));
    mockFindByIdAndUpdate.mockReturnValue(selected({ preferences: {} }));
    mockInsertMany.mockResolvedValue([]);
  });

  it('defaults safely to in-app delivery only', async () => {
    const service = require('../../server/src/services/notificationDeliveryService');
    await expect(service.getNotificationPreferences('user-1')).resolves.toEqual({
      inApp: { enabled: true }, emailDigest: { enabled: false, frequency: 'daily' }, webPush: { enabled: false },
    });
  });

  it('queues enabled external channels without falsely marking them delivered', async () => {
    const service = require('../../server/src/services/notificationDeliveryService');
    const preferences = {
      inApp: { enabled: false }, emailDigest: { enabled: true, frequency: 'weekly' }, webPush: { enabled: true },
    };
    await service.queueNotificationDeliveries({ userId: 'user-1', notificationId: 'note-1', preferences, payload: { title: 'Update' } });

    const rows = mockInsertMany.mock.calls[0][0];
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'in_app', status: 'skipped' }),
      expect.objectContaining({ channel: 'email_digest', status: 'queued', payload: expect.objectContaining({ digestFrequency: 'weekly' }) }),
      expect.objectContaining({ channel: 'web_push', status: 'queued' }),
    ]));
    expect(rows.some((row) => row.channel !== 'in_app' && row.status === 'delivered')).toBe(false);
  });
});
