const mockCreate = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../../server/src/app', () => ({
  __esModule: true,
  default: {
    db: {
      models: {
        EmailOutbox: { create: mockCreate, findOne: mockFindOne, find: jest.fn(), findOneAndUpdate: mockFindOneAndUpdate, updateOne: jest.fn() },
        NotificationOutbox: { updateMany: jest.fn() },
      },
    },
  },
}));

import { decryptEmailPayload } from '../../server/src/services/emailProviderStore';
import { maskRecipient, queueEmail, retryEmailDelivery } from '../../server/src/services/emailOutboxService';

describe('email outbox', () => {
  const originalKey = process.env.WIKITRUTH_CRYPTO_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WIKITRUTH_CRYPTO_KEY = 'email-outbox-unit-test-key';
  });

  afterAll(() => {
    if (typeof originalKey === 'undefined') delete process.env.WIKITRUTH_CRYPTO_KEY;
    else process.env.WIKITRUTH_CRYPTO_KEY = originalKey;
  });

  it('stores only a masked recipient and encrypted token-bearing payload', async () => {
    mockCreate.mockImplementation(async (value: Record<string, unknown>) => ({
      toObject: () => ({ _id: 'outbox-1', ...value }),
    }));
    await queueEmail({
      templateKey: 'password_reset',
      to: 'Private.Person@Example.Test',
      locals: { actionUrl: 'https://example.test/reset?token=super-secret-token' },
      idempotencyKey: 'password-reset:test',
    });
    const stored = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(stored.recipientMasked).toBe('p***@example.test');
    expect(stored).not.toHaveProperty('to');
    expect(JSON.stringify(stored)).not.toContain('super-secret-token');
    expect(decryptEmailPayload<{ to: string; locals: { actionUrl: string } }>(String(stored.encryptedPayload)))
      .toEqual({ to: 'private.person@example.test', locals: { actionUrl: 'https://example.test/reset?token=super-secret-token' } });
  });

  it('does not leak short or malformed recipients when masking', () => {
    expect(maskRecipient('a@example.test')).toBe('a***@example.test');
    expect(maskRecipient('not-an-email')).toBe('***');
  });

  it('requeues only an eligible failed delivery', async () => {
    mockFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: 'outbox-1', status: 'queued' }) });
    await expect(retryEmailDelivery('outbox-1')).resolves.toBe(true);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'outbox-1', status: 'failed' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'queued' }) }),
      { new: true },
    );
  });
});
