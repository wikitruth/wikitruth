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

  it('loads all public sign-in capabilities from one endpoint', async () => {
    const payload = {
      success: true,
      providers: {},
      emailCode: { enabled: true },
      passkeys: { enabled: true },
      fastSwitchAvailable: false,
    };
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(authApi.config()).resolves.toBe(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/config',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('calls passwordless email and session-security endpoints', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, sessions: [] }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await authApi.requestEmailCode({ email: 'person@example.com', rememberMe: true });
    await authApi.verifyEmailCode({ challengeId: 'challenge', code: '123456' });
    await authApi.sessions();
    await authApi.revokeSession('session-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/email-code/request', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/email-code/verify', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/sessions', expect.objectContaining({ credentials: 'include' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/sessions/session-1', expect.objectContaining({ method: 'DELETE' }));
  });
});
