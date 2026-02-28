import authApi from './auth';

describe('authApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls login endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { _id: '1' } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await authApi.login({ username: 'demo', password: 'secret' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calls me endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { _id: '1' } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await authApi.me();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('calls providers endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ providers: {} }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await authApi.providers();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/providers',
      expect.objectContaining({ credentials: 'include' })
    );
  });
});
