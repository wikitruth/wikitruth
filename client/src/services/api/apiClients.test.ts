import apiClientsApi from './apiClients';

describe('apiClientsApi', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a scoped credential with CSRF protection', async () => {
    document.cookie = '_csrfToken=agent-csrf';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, token: 'once' }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const payload = {
      name: 'Research agent', userId: 'user-1', scopes: ['entries:read', 'contributions:write'] as const,
      expiresAt: null, rateLimitPerMinute: 60,
    };
    await apiClientsApi.create({ ...payload, scopes: [...payload.scopes] });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/api-clients', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'x-csrf-token': 'agent-csrf' }),
      body: JSON.stringify({ ...payload, scopes: [...payload.scopes] }),
    }));
  });

  it('rotates and revokes by credential ID', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await apiClientsApi.rotate('client/1');
    await apiClientsApi.revoke('client/1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/api-clients/client%2F1/rotate', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/api-clients/client%2F1', expect.objectContaining({ method: 'DELETE' }));
  });
});
