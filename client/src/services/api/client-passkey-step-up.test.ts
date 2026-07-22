const mockStartAuthentication = jest.fn().mockResolvedValue({ id: 'credential-1' });

jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startAuthentication: mockStartAuthentication,
  startRegistration: jest.fn(),
}));

import createApiClient from './client';

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe('automatic passkey step-up', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('performs one passkey ceremony and retries a precondition-rejected mutation once', async () => {
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: false,
        code: 'PASSKEY_STEP_UP_REQUIRED',
        message: 'Confirm this action with a passkey.',
      }, 428))
      .mockResolvedValueOnce(jsonResponse({
        ceremonyId: 'step-up-1',
        options: { challenge: 'challenge', rpId: 'wikitruth.net' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        user: { _id: 'admin-1', username: 'admin' },
      }))
      .mockResolvedValueOnce(jsonResponse({ success: true, updated: true })) as unknown as typeof fetch;

    const request = createApiClient();
    await expect(request('/admin/statuses/1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Reviewed' }),
    })).resolves.toEqual({ success: true, updated: true });

    expect(mockStartAuthentication).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      4,
      '/api/admin/statuses/1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
