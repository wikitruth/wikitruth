import apiClientsApi from './apiClients';

describe('apiClientsApi', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a scoped credential with CSRF protection', async () => {
    document.cookie = '_csrfToken=agent-csrf';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, token: 'once' }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const payload = {
      name: 'Research agent', userId: 'user-1', scopes: ['entries:read', 'entries:create'] as const,
      policy: { tenantIds: [], entryTypes: ['topic'] as const, parentRootIds: [], ownContentOnly: true, maxVisibility: 'public_only' as const, sourceRequired: true, maxBatchSize: 10 },
      expiresAt: null, rateLimitPerMinute: 60,
    };
    await apiClientsApi.create({ ...payload, scopes: [...payload.scopes], policy: { ...payload.policy, entryTypes: [...payload.policy.entryTypes] } });
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

  it('loads a bounded credential usage period', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await apiClientsApi.usage('client/1', 14);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/api-clients/client%2F1/usage?days=14', expect.objectContaining({ credentials: 'include' }));
  });

  it('normalizes the paginated accountable-user collection', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, items: [{ _id: 'user-1', username: 'owner' }] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(apiClientsApi.users()).resolves.toEqual([{ _id: 'user-1', username: 'owner' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users?page=1&limit=100', expect.objectContaining({ credentials: 'include' }));
  });

  it('normalizes legacy credential records without policy boundaries', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, clients: [{ id: 'legacy-1', scopes: ['entries:read'] }] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const response = await apiClientsApi.list();
    expect(response.clients[0]).toEqual(expect.objectContaining({
      policy: expect.objectContaining({
        entryTypes: ['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion'],
        ownContentOnly: true,
        maxVisibility: 'public_only',
        maxBatchSize: 25,
      }),
    }));
  });
});
