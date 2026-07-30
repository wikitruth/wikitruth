import type { WikitruthRequest, WikitruthResponse } from '../../server/src/types/http';
import {
  enforceAuthenticatedWebSession,
  listWebSessions,
  registerAuthenticatedWebSession,
  revokeWebSessionById,
} from '../../server/src/services/webSessionService';

function requestFixture(model: Record<string, jest.Mock>): WikitruthRequest {
  const session = {
    cookie: { maxAge: 0, expires: undefined as Date | undefined },
    save: (callback: (error?: unknown) => void) => callback(),
    destroy: jest.fn((callback: (error?: unknown) => void) => callback()),
  };
  return {
    sessionID: 'raw-session-secret',
    session,
    user: { _id: 'user-1', id: 'user-1', username: 'person' },
    ip: '127.0.0.1',
    get: (name: string) => name.toLowerCase() === 'user-agent' ? 'Mozilla/5.0 Macintosh Safari/605.1' : undefined,
    app: {
      config: {
        cryptoKey: 'web-session-test-secret',
        session: {
          name: 'sid',
          authenticated: {
            standardMaxAgeMs: 86400000,
            rememberedMaxAgeMs: 2592000000,
            activityUpdateIntervalMs: 300000,
          },
        },
      },
      db: { models: { WebSession: model } },
    },
    logout: jest.fn((callback: (error?: unknown) => void) => callback()),
  } as unknown as WikitruthRequest;
}

function modelFixture() {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
}

describe('authenticated web-session registry', () => {
  it('hashes the session identifier and fixes remembered expiry at 30 days', async () => {
    const model = modelFixture();
    model.create.mockImplementation(async values => ({ ...values, _id: 'registry-1' }));
    const req = requestFixture(model);
    const before = Date.now();

    await registerAuthenticatedWebSession(req, 'email_code', true);

    const stored = model.create.mock.calls[0][0];
    expect(stored.sessionKeyHash).toMatch(/^[a-f\d]{64}$/);
    expect(JSON.stringify(stored)).not.toContain('raw-session-secret');
    expect(req.session.webSession).toEqual(expect.objectContaining({
      registryId: 'registry-1',
      remembered: true,
    }));
    expect(req.session.cookie.expires!.getTime()).toBeGreaterThanOrEqual(before + 2592000000);
  });

  it('lists only active user sessions and identifies the current one', async () => {
    const model = modelFixture();
    const now = new Date();
    model.find.mockReturnValue({
      sort: () => ({
        lean: async () => [{
          _id: 'registry-1',
          authenticationMethod: 'passkey',
          remembered: false,
          userAgent: 'Mozilla/5.0 Macintosh Safari/605.1',
          ipAddress: '127.0.0.1',
          createDate: now,
          lastActivityAt: now,
          absoluteExpiresAt: new Date(now.getTime() + 60000),
        }],
      }),
    });
    const req = requestFixture(model);
    req.session.webSession = {
      registryId: 'registry-1',
      sessionKeyHash: 'a'.repeat(64),
      remembered: false,
      absoluteExpiresAt: new Date(now.getTime() + 60000).toISOString(),
    };

    await expect(listWebSessions(req)).resolves.toEqual([
      expect.objectContaining({ current: true, device: 'Safari on Mac' }),
    ]);
  });

  it('does not allow the current registry session to revoke itself through the revoke-one API', async () => {
    const model = modelFixture();
    const req = requestFixture(model);
    req.session.webSession = {
      registryId: 'registry-1',
      sessionKeyHash: 'a'.repeat(64),
      remembered: false,
      absoluteExpiresAt: new Date(Date.now() + 60000).toISOString(),
    };
    await expect(revokeWebSessionById(req, 'registry-1')).resolves.toBe(false);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('fails closed and clears a revoked authenticated session', async () => {
    const model = modelFixture();
    const req = requestFixture(model);
    const expiresAt = new Date(Date.now() + 60000);
    req.session.webSession = {
      registryId: 'registry-1',
      sessionKeyHash: 'a'.repeat(64),
      remembered: false,
      absoluteExpiresAt: expiresAt.toISOString(),
    };
    model.findOne.mockReturnValue({
      lean: async () => ({
        _id: 'registry-1',
        revokedAt: new Date(),
        absoluteExpiresAt: expiresAt,
        lastActivityAt: new Date(),
      }),
    });
    const res = { clearCookie: jest.fn() } as unknown as WikitruthResponse;
    const next = jest.fn();

    await enforceAuthenticatedWebSession(req, res, next);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('sid', expect.any(Object));
    expect(next).toHaveBeenCalledWith();
  });
});
