import adminApi from './admin';

describe('adminApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.cookie = '_csrfToken=; Max-Age=0; path=/';
  });

  it('loads dashboard counts', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.dashboard();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('loads users list', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, items: [] }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.users({ page: 3, limit: 50, query: 'ada lovelace' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users?page=3&limit=50&q=ada+lovelace',
      expect.any(Object)
    );
  });

  it('loads one user directly instead of scanning a collection page', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, item: { _id: 'user/1', username: 'ada' } }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(adminApi.user('user/1')).resolves.toEqual({ _id: 'user/1', username: 'ada' });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/user%2F1', expect.any(Object));
  });

  it('rejects failed admin responses with the server message', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ success: false, message: 'Admin storage is unavailable' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(adminApi.accounts()).rejects.toThrow('Admin storage is unavailable');
  });

  it('sends csrf token for mutation requests', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.deleteStatus('active');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/statuses/active',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
      })
    );
  });

  it('creates users through admin endpoint', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, user: { _id: 'u1' } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.createUser({
      username: 'demo',
      email: 'demo@example.com',
      password: 'secret12',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
      })
    );
  });

  it('updates administrator groups via dedicated endpoint', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, admin: { _id: 'a1' } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.updateAdministratorGroups('a1', ['ops', 'moderators']);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/administrators/a1/groups',
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('deletes accounts and administrators via dedicated endpoints', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.deleteAccount('acc-1');
    await adminApi.deleteAdministrator('adm-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/accounts/acc-1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/administrators/adm-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
