import emailOperationsApi from './emailOperations';

describe('emailOperationsApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.cookie = '_csrfToken=; Max-Age=0; path=/';
  });

  it('loads the email operations summary', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, providers: [] }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await emailOperationsApi.summary();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/email-operations', expect.objectContaining({ credentials: 'include' }));
  });

  it('sends provider credentials only in a passkey-protected mutation request', async () => {
    document.cookie = '_csrfToken=email-csrf';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, provider: {} }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await emailOperationsApi.createProvider({
      name: 'Resend', type: 'resend', enabled: true, fromName: 'Wikitruth',
      fromAddress: 'hello@example.test', secrets: { apiKey: 'write-only-key' },
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/email-operations/providers', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'x-csrf-token': 'email-csrf' }),
      body: expect.stringContaining('write-only-key'),
    }));
  });

  it('requests a synthetic template preview and queues a test send', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await emailOperationsApi.preview('sign_in_code');
    await emailOperationsApi.sendTest('sign_in_code');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/email-operations/templates/sign_in_code/preview', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/email-operations/test', expect.objectContaining({ method: 'POST' }));
  });
});
