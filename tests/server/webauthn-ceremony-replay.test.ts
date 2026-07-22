const ceremonyFindOneAndUpdate = jest.fn();
const credentialFindOne = jest.fn();
const userFindById = jest.fn();
const verifyAuthenticationResponse = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      AuthCeremony: { findOneAndUpdate: ceremonyFindOneAndUpdate },
      PasskeyCredential: { findOne: credentialFindOne },
      User: { findById: userFindById },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: jest.fn(),
}));

jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn(),
  generateRegistrationOptions: jest.fn(),
  verifyAuthenticationResponse,
  verifyRegistrationResponse: jest.fn(),
}));

import type { WikitruthRequest } from '../../server/src/types/http';
import { verifyPasskeyAuthentication } from '../../server/src/services/webAuthnService';

function requestFixture(): WikitruthRequest {
  return {
    protocol: 'https',
    get: (name: string) => (name.toLowerCase() === 'host' ? 'wikitruth.net' : undefined),
    app: {
      config: {
        webAuthn: {
          enabled: true,
          rpId: 'wikitruth.net',
          origins: ['https://wikitruth.net'],
          canonicalOrigin: 'https://wikitruth.net',
        },
      },
    },
  } as unknown as WikitruthRequest;
}

describe('WebAuthn ceremony replay protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const ceremony = {
      _id: 'ceremony-1',
      purpose: 'authentication',
      challengeHash: 'stored-hash',
      rpId: 'wikitruth.net',
      expectedOrigin: 'https://wikitruth.net',
    };
    ceremonyFindOneAndUpdate
      .mockReturnValueOnce({ lean: async () => ceremony })
      .mockReturnValueOnce({ lean: async () => null });
    const credential = {
      _id: 'passkey-1',
      credentialId: 'credential-1',
      userId: 'user-1',
      publicKey: Buffer.from('public-key'),
      counter: 0,
      transports: ['internal'],
      save: jest.fn(),
      toObject: () => ({
        _id: 'passkey-1',
        credentialId: 'credential-1',
        userId: 'user-1',
        name: 'Primary passkey',
      }),
    };
    credentialFindOne.mockReturnValue({ select: async () => credential });
    userFindById.mockResolvedValue({ _id: 'user-1', username: 'alice', isActive: 'yes' });
    verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: {
        userVerified: true,
        newCounter: 1,
        credentialBackedUp: true,
        credentialDeviceType: 'multiDevice',
      },
    });
  });

  it('atomically consumes a ceremony before verification and rejects reuse', async () => {
    const input = {
      req: requestFixture(),
      ceremonyId: 'ceremony-1',
      purpose: 'authentication' as const,
      response: { id: 'credential-1' } as never,
    };

    await expect(verifyPasskeyAuthentication(input)).resolves.toEqual(
      expect.objectContaining({ verifiedAt: expect.any(String) })
    );
    await expect(verifyPasskeyAuthentication(input)).rejects.toThrow(/already used/i);
    expect(ceremonyFindOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(verifyAuthenticationResponse).toHaveBeenCalledTimes(1);
  });
});
