const mockBrowserSupportsWebAuthn = jest.fn(() => true);
const mockStartAuthentication = jest.fn();
const mockStartRegistration = jest.fn();

jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: mockBrowserSupportsWebAuthn,
  startAuthentication: mockStartAuthentication,
  startRegistration: mockStartRegistration,
}));

import passkeyApi from './passkeys';

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe('passkeyApi', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads the relying-party and canonical-origin configuration', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse({
      success: true,
      passkeys: {
        enabled: true,
        rpName: 'Wikitruth',
        canonicalOrigin: 'https://wikitruth.net',
        isCanonicalOrigin: true,
        passwordlessEnabled: true,
        adminStepUpRequired: true,
        stepUpMaxAgeSeconds: 600,
      },
    })) as unknown as typeof fetch;

    await expect(passkeyApi.config()).resolves.toEqual(
      expect.objectContaining({ canonicalOrigin: 'https://wikitruth.net' })
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/auth/passkeys/config',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('runs the authentication ceremony and verifies the browser assertion', async () => {
    const assertion = { id: 'credential-1', type: 'public-key' };
    mockStartAuthentication.mockResolvedValue(assertion);
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse({
        ceremonyId: 'ceremony-1',
        options: { challenge: 'challenge', rpId: 'wikitruth.net' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        user: { _id: 'user-1', username: 'alice' },
      })) as unknown as typeof fetch;

    await expect(passkeyApi.authenticate('step_up')).resolves.toEqual(
      expect.objectContaining({ success: true })
    );
    expect(mockStartAuthentication).toHaveBeenCalledWith(expect.objectContaining({
      optionsJSON: expect.objectContaining({ challenge: 'challenge' }),
      useBrowserAutofill: false,
    }));
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/auth/passkeys/authentication/verify',
      expect.objectContaining({
        body: JSON.stringify({
          ceremonyId: 'ceremony-1',
          purpose: 'step_up',
          response: assertion,
        }),
      })
    );
  });

  it('creates a resident passkey before verifying passwordless signup', async () => {
    const registration = { id: 'credential-1', type: 'public-key' };
    mockStartRegistration.mockResolvedValue(registration);
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse({
        ceremonyId: 'signup-1',
        options: { challenge: 'challenge', rp: { name: 'Wikitruth' }, user: {} },
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        user: { _id: 'user-1', username: 'alice' },
      })) as unknown as typeof fetch;

    await passkeyApi.passwordlessSignup({ username: 'alice', email: 'alice@example.com' });

    expect(mockStartRegistration).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/auth/passkeys/signup/verify',
      expect.objectContaining({
        body: JSON.stringify({
          ceremonyId: 'signup-1',
          response: registration,
          name: 'Primary passkey',
        }),
      })
    );
  });
});
