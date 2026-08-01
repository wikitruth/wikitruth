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

  it('falls back to legacy capability endpoints during a rolling deployment', async () => {
    const emailCode = {
      enabled: true,
      codeLength: 6,
      expiresInSeconds: 600,
      resendDelaySeconds: 60,
      canonicalOrigin: 'https://v2.wikitruth.net',
      isCanonicalOrigin: true,
    };
    const passkeys = {
      enabled: true,
      rpName: 'Wikitruth',
      canonicalOrigin: 'https://v2.wikitruth.net',
      isCanonicalOrigin: true,
      passwordlessEnabled: true,
      adminStepUpRequired: true,
      stepUpMaxAgeSeconds: 600,
    };
    const fetchMock = jest.fn().mockImplementation(async (url: string) => {
      if (url === '/api/auth/config') {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      if (url === '/api/auth/providers') {
        return { ok: true, json: async () => ({ success: true, providers: { github: true } }) };
      }
      if (url === '/api/auth/email-code/config') {
        return { ok: true, json: async () => ({ success: true, emailCode }) };
      }
      if (url === '/api/auth/passkeys/config') {
        return { ok: true, json: async () => ({ success: true, passkeys }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(authApi.config()).resolves.toEqual({
      success: true,
      providers: { github: true },
      emailCode,
      passkeys,
      fastSwitchAvailable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('fails closed when the unified and passwordless capability endpoints are unavailable', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(authApi.config()).rejects.toThrow('Auth request failed: 404');
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
