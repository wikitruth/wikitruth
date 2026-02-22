import createApiClient from './client';

describe('createApiClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('uses configured base url', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: '/api/v1' });
    await client('/topics');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/topics',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('throws on non-ok response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = createApiClient();

    await expect(client('/bad')).rejects.toThrow('API request failed: 500');
  });
});
