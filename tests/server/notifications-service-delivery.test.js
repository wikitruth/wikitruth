'use strict';

const mockCreate = jest.fn();
const mockGetPreferences = jest.fn();
const mockQueueDeliveries = jest.fn();

jest.mock('../../server/src/app', () => ({ db: { models: { Notification: { create: (...args) => mockCreate(...args) } } } }));
jest.mock('../../server/src/services/notificationDeliveryService', () => ({
  getNotificationPreferences: (...args) => mockGetPreferences(...args),
  queueNotificationDeliveries: (...args) => mockQueueDeliveries(...args),
}));

describe('notification event delivery integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPreferences.mockResolvedValue({
      inApp: { enabled: false }, emailDigest: { enabled: true, frequency: 'daily' }, webPush: { enabled: false },
    });
    mockCreate.mockResolvedValue({ _id: 'notification-1' });
    mockQueueDeliveries.mockResolvedValue(undefined);
  });

  it('applies channel preferences and creates auditable delivery records', async () => {
    const { createNotification } = require('../../server/src/services/notificationsService');
    await createNotification({ userId: 'user-1', type: 'reply', title: 'A reply', link: '/entry/1' });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ inAppVisible: false }));
    expect(mockQueueDeliveries).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', notificationId: 'notification-1',
      preferences: expect.objectContaining({ emailDigest: expect.objectContaining({ enabled: true }) }),
    }));
  });
});
