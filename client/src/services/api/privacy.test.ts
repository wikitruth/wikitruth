import privacyApi from './privacy';

describe('privacyApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.cookie = '_csrfToken=; Max-Age=0; path=/';
  });

  it('creates authenticated requests with CSRF protection', async () => {
    document.cookie = '_csrfToken=privacy-csrf';
    const request = { id: 'request/1', type: 'export', status: 'submitted' };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, request }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(privacyApi.createRequest('export', 'Portability request')).resolves.toEqual(request);
    expect(fetchMock).toHaveBeenCalledWith('/api/privacy/requests', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ type: 'export', reason: 'Portability request' }),
      headers: expect.objectContaining({ 'x-csrf-token': 'privacy-csrf' }),
    }));
  });

  it('authorizes and consumes an export through separate POST requests', async () => {
    document.cookie = '_csrfToken=privacy-csrf';
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, authorization: { token: 'one-time-token', expiresAt: '2026-08-04T00:10:00.000Z' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-disposition': 'attachment; filename="wikitruth-pr-1.json"' }),
        blob: async () => new Blob(['{}'], { type: 'application/json' }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await privacyApi.downloadExport('request/1');

    expect(result.filename).toBe('wikitruth-pr-1.json');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/privacy/requests/request%2F1/download-token', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/privacy/requests/request%2F1/download', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ token: 'one-time-token' }),
      headers: expect.objectContaining({ 'x-csrf-token': 'privacy-csrf' }),
    }));
  });
});
