import type { WikitruthRequest, WikitruthResponse } from '../../server/src/types/http';
import {
  getRequestOrigin,
  getWebAuthnConfig,
  isCanonicalAuthOrigin,
  safeRelativeReturnPath,
} from '../../server/src/services/webAuthnConfigService';
import {
  hasRecentPasskeyAssurance,
  hasRecentRecoveryAssurance,
  requireRecentPasskeyAssurance,
  setAuthenticationAssurance,
} from '../../server/src/services/authAssuranceService';

function requestFixture(overrides: Record<string, unknown> = {}): WikitruthRequest {
  const config = {
    enabled: true,
    rpId: 'wikitruth.net',
    rpName: 'Wikitruth',
    origins: ['https://wikitruth.net'],
    canonicalOrigin: 'https://wikitruth.net',
    trustedTenantOrigins: ['https://fixthephilippines.org'],
    challengeTtlSeconds: 300,
    handoffTtlSeconds: 120,
    stepUpMaxAgeSeconds: 600,
    recoveryCodeCount: 10,
    adminStepUpRequired: true,
    passwordlessEnabled: true,
  };
  return {
    protocol: 'https',
    get: (name: string) => (name.toLowerCase() === 'host' ? 'wikitruth.net' : undefined),
    app: { config: { webAuthn: config } },
    session: {},
    ...overrides,
  } as unknown as WikitruthRequest;
}

describe('WebAuthn configuration and session assurance', () => {
  it('uses exact configured origins and the permanent RP ID', () => {
    const req = requestFixture();
    expect(getRequestOrigin(req)).toBe('https://wikitruth.net');
    expect(isCanonicalAuthOrigin(req)).toBe(true);
    expect(getWebAuthnConfig(req)).toEqual(
      expect.objectContaining({
        rpId: 'wikitruth.net',
        canonicalOrigin: 'https://wikitruth.net',
        origins: ['https://wikitruth.net'],
      })
    );
  });

  it('does not trust malformed or insecure non-local origins', () => {
    const req = requestFixture({
      protocol: 'http',
      get: () => 'wikitruth.net',
    });
    expect(getRequestOrigin(req)).toBe('');
    expect(isCanonicalAuthOrigin(req)).toBe(false);
  });

  it('accepts only relative same-origin return paths', () => {
    expect(safeRelativeReturnPath('/civic/projects?status=open')).toBe(
      '/civic/projects?status=open'
    );
    expect(safeRelativeReturnPath('https://attacker.example/')).toBe('/');
    expect(safeRelativeReturnPath('//attacker.example/')).toBe('/');
    expect(safeRelativeReturnPath('/safe\nLocation:https://attacker.example')).toBe('/');
  });

  it('distinguishes passkey and recovery assurance', () => {
    const req = requestFixture();
    setAuthenticationAssurance(req, 'passkey', { passkeyVerifiedAt: new Date().toISOString() });
    expect(hasRecentPasskeyAssurance(req)).toBe(true);
    expect(hasRecentRecoveryAssurance(req)).toBe(false);

    setAuthenticationAssurance(req, 'recovery_code');
    expect(hasRecentPasskeyAssurance(req)).toBe(false);
    expect(hasRecentRecoveryAssurance(req)).toBe(true);
  });

  it('expires assurance and returns a stable step-up response', () => {
    const req = requestFixture();
    setAuthenticationAssurance(req, 'passkey', {
      passkeyVerifiedAt: new Date(Date.now() - 601_000).toISOString(),
    });
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json } as unknown as WikitruthResponse;
    expect(requireRecentPasskeyAssurance(req, res)).toBe(false);
    expect(status).toHaveBeenCalledWith(428);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PASSKEY_STEP_UP_REQUIRED' })
    );
  });
});
