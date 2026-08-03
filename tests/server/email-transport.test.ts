import { sendEmailWithProvider } from '../../server/src/services/emailTransport';

describe('email transport', () => {
  const provider = {
    id: 'resend-provider',
    name: 'Resend',
    type: 'resend' as const,
    enabled: true,
    fromName: 'Wikitruth',
    fromAddress: 'hello@wikitruth.example',
    encryptedSecrets: '',
    createDate: new Date(0).toISOString(),
    editDate: new Date(0).toISOString(),
  };

  afterEach(() => jest.restoreAllMocks());

  it('uses the native Resend API with an idempotency key', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'email_123' }),
    } as Response);
    const receipt = await sendEmailWithProvider(provider, { apiKey: 're_test' }, {
      to: 'admin@example.test', subject: 'Test', html: '<p>Test</p>', text: 'Test', idempotencyKey: 'test-key',
    });
    expect(receipt.providerMessageId).toBe('email_123');
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'Idempotency-Key': 'test-key' }),
    }));
  });

  it('classifies Resend rate limits as transient failures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ name: 'rate_limit_exceeded', message: 'Slow down' }),
    } as Response);
    await expect(sendEmailWithProvider(provider, { apiKey: 're_test' }, {
      to: 'admin@example.test', subject: 'Test', html: '<p>Test</p>', text: 'Test',
    })).rejects.toMatchObject({ transient: true, statusCode: 429 });
  });
});
