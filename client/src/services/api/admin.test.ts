import adminApi from './admin';

describe('adminApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads dashboard counts', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.dashboard();

    expect(fetchMock).toHaveBeenCalledWith('/api/admin', expect.objectContaining({ credentials: 'include' }));
  });

  it('loads users list', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.users();

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users', expect.any(Object));
  });
});
