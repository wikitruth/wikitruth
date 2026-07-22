const handoffCreate = jest.fn();
const handoffFindOneAndUpdate = jest.fn();
const tenantFind = jest.fn();
const userFindById = jest.fn();
const logEntryEvent = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      AuthHandoff: { create: handoffCreate, findOneAndUpdate: handoffFindOneAndUpdate },
      CivicTenant: { find: tenantFind },
      User: { findById: userFindById },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({ logEntryEvent }));

import type { WikitruthRequest } from '../../server/src/types/http';
import {
  consumeAuthHandoff,
  createAuthHandoff,
} from '../../server/src/services/authHandoffService';
import { setAuthenticationAssurance } from '../../server/src/services/authAssuranceService';

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

function requestFixture(origin = 'https://wikitruth.net'): WikitruthRequest {
  const parsed = new URL(origin);
  const session = {
    regenerate: (callback: (error?: unknown) => void) => callback(),
    save: (callback: (error?: unknown) => void) => callback(),
  };
  const req = {
    protocol: parsed.protocol.replace(':', ''),
    get: (name: string) => {
      if (name.toLowerCase() === 'host') return parsed.host;
      if (name.toLowerCase() === 'origin') return origin;
      return undefined;
    },
    app: { config: { webAuthn: config } },
    session,
    user: { _id: 'user-1', username: 'alice' },
    login: jest.fn((_user: unknown, callback: (error?: unknown) => void) => callback()),
  } as unknown as WikitruthRequest;
  return req;
}

describe('cross-domain authentication handoffs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tenantFind.mockReturnValue({
      select: () => ({ lean: async () => [] }),
    });
  });

  it('stores only a hash and builds a callback for the exact trusted origin', async () => {
    const req = requestFixture();
    setAuthenticationAssurance(req, 'passkey', {
      passkeyVerifiedAt: new Date().toISOString(),
    });

    const result = await createAuthHandoff(
      req,
      'https://fixthephilippines.org',
      '/civic/projects?status=open'
    );

    expect(result.callbackUrl).toMatch(
      /^https:\/\/fixthephilippines\.org\/auth\/handoff\?code=/
    );
    const created = handoffCreate.mock.calls[0][0];
    expect(created.codeHash).toMatch(/^[a-f\d]{64}$/);
    expect(result.callbackUrl).not.toContain(created.codeHash);
    expect(created.targetOrigin).toBe('https://fixthephilippines.org');
    expect(created.returnPath).toBe('/civic/projects?status=open');
  });

  it('rejects lookalike and untrusted targets', async () => {
    await expect(
      createAuthHandoff(requestFixture(), 'https://fixthephilippines.org.attacker.test', '/')
    ).rejects.toThrow('not trusted');
    expect(handoffCreate).not.toHaveBeenCalled();
  });

  it('consumes a valid handoff only for its bound target origin', async () => {
    const req = requestFixture('https://fixthephilippines.org');
    const user = { _id: 'user-1', username: 'alice', isActive: 'yes' };
    handoffFindOneAndUpdate.mockReturnValue({
      lean: async () => ({
        userId: 'user-1',
        sourceOrigin: 'https://wikitruth.net',
        targetOrigin: 'https://fixthephilippines.org',
        returnPath: '/civic',
        authenticationMethod: 'passkey',
        authenticatedAt: new Date(),
        passkeyVerifiedAt: new Date(),
      }),
    });
    userFindById.mockResolvedValue(user);

    const result = await consumeAuthHandoff(req, 'A'.repeat(43));

    expect(handoffFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ targetOrigin: 'https://fixthephilippines.org', consumedAt: null }),
      expect.objectContaining({ $set: { consumedAt: expect.any(Date) } }),
      { new: false }
    );
    expect(req.login).toHaveBeenCalledWith(user, expect.any(Function));
    expect(result.returnPath).toBe('/civic');
  });

  it('rejects replay after the atomic consumer no longer returns the handoff', async () => {
    const req = requestFixture('https://fixthephilippines.org');
    const handoff = {
      userId: 'user-1',
      sourceOrigin: 'https://wikitruth.net',
      targetOrigin: 'https://fixthephilippines.org',
      returnPath: '/',
      authenticationMethod: 'passkey',
      authenticatedAt: new Date(),
      passkeyVerifiedAt: new Date(),
    };
    handoffFindOneAndUpdate
      .mockReturnValueOnce({ lean: async () => handoff })
      .mockReturnValueOnce({ lean: async () => null });
    userFindById.mockResolvedValue({ _id: 'user-1', username: 'alice', isActive: 'yes' });

    await expect(consumeAuthHandoff(req, 'B'.repeat(43))).resolves.toEqual(
      expect.objectContaining({ returnPath: '/' })
    );
    await expect(consumeAuthHandoff(req, 'B'.repeat(43))).rejects.toThrow(
      /invalid, expired, already used/i
    );
  });
});
