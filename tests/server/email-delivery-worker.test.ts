const mockQueueDigests = jest.fn();
const mockProcessBatch = jest.fn();

jest.mock('../../server/src/services/emailDigestService', () => ({
  queueDueNotificationDigests: mockQueueDigests,
}));
jest.mock('../../server/src/services/emailOutboxService', () => ({
  processEmailOutboxBatch: mockProcessBatch,
}));

import { runEmailDeliveryCycle } from '../../server/src/services/emailDeliveryWorker';

describe('email delivery worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueDigests.mockResolvedValue(1);
    mockProcessBatch.mockResolvedValue({ attempted: 2, delivered: 2 });
  });

  it('queues due digests before processing the durable email outbox', async () => {
    await runEmailDeliveryCycle();
    expect(mockQueueDigests).toHaveBeenCalledTimes(1);
    expect(mockProcessBatch).toHaveBeenCalledWith(20);
    expect(mockQueueDigests.mock.invocationCallOrder[0]).toBeLessThan(mockProcessBatch.mock.invocationCallOrder[0]);
  });
});
