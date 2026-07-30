const challengeCount = jest.fn();
const challengeFindOne = jest.fn();
const challengeCreate = jest.fn();
const challengeUpdateOne = jest.fn();
const challengeUpdateMany = jest.fn();
const challengeFindOneAndUpdate = jest.fn();
const userFindOne = jest.fn();
const userFindById = jest.fn();
const userCreate = jest.fn();
const userDelete = jest.fn();
const accountCreate = jest.fn();
const accountDelete = jest.fn();
const accountUpdate = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      EmailAuthChallenge: {
        countDocuments: challengeCount,
        findOne: challengeFindOne,
        create: challengeCreate,
        updateOne: challengeUpdateOne,
        updateMany: challengeUpdateMany,
        findOneAndUpdate: challengeFindOneAndUpdate,
      },
      User: {
        findOne: userFindOne,
        findById: userFindById,
        create: userCreate,
        findByIdAndDelete: userDelete,
      },
      Account: {
        create: accountCreate,
        findByIdAndDelete: accountDelete,
        findByIdAndUpdate: accountUpdate,
      },
    },
  },
}));

import type { WikitruthRequest } from '../../server/src/types/http';
import {
  completeEmailAuthSignup,
  createEmailAuthChallenge,
  EmailAuthError,
  verifyEmailAuthChallenge,
} from '../../server/src/services/emailAuthService';

function requestFixture(): WikitruthRequest {
  return {
    ip: '127.0.0.1',
    app: {
      config: {
        cryptoKey: 'test-email-auth-secret',
        emailAuth: {
          enabled: true,
          codeTtlSeconds: 600,
          maximumAttempts: 5,
          resendDelaySeconds: 60,
          maximumRequestsPerEmailPerHour: 5,
          maximumRequestsPerIpPerHour: 20,
        },
      },
    },
  } as unknown as WikitruthRequest;
}

function challengeQuery(value: unknown) {
  return {
    sort: () => ({ lean: async () => value }),
    lean: async () => value,
  };
}

describe('email authentication challenge service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    challengeCount.mockResolvedValue(0);
    challengeFindOne.mockReturnValue(challengeQuery(null));
    challengeUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    challengeUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    challengeCreate.mockResolvedValue({ _id: 'challenge-record' });
    userFindOne.mockResolvedValue(null);
    userFindById.mockResolvedValue(null);
    userDelete.mockResolvedValue(null);
    accountDelete.mockResolvedValue(null);
    accountUpdate.mockResolvedValue(null);
  });

  it('stores only keyed hashes and supersedes older active challenges', async () => {
    const result = await createEmailAuthChallenge(requestFixture(), {
      email: 'person@example.com',
      rememberMe: true,
      targetOrigin: 'https://fix.example',
      returnPath: '/civic',
    });

    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.linkToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(challengeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'person@example.com', consumedAt: null }),
      expect.objectContaining({ $set: { supersededAt: expect.any(Date) } })
    );
    const stored = challengeCreate.mock.calls[0][0];
    expect(stored.codeHash).toMatch(/^[a-f\d]{64}$/);
    expect(stored.linkTokenHash).toMatch(/^[a-f\d]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(result.code);
    expect(JSON.stringify(stored)).not.toContain(result.linkToken);
    expect(stored.rememberMe).toBe(true);
  });

  it('reuses the active challenge during the resend cooldown without sending again', async () => {
    challengeFindOne.mockReturnValue(challengeQuery({
      challengeId: 'active-challenge',
      resendAvailableAt: new Date(Date.now() + 30000),
      expiresAt: new Date(Date.now() + 300000),
    }));

    const result = await createEmailAuthChallenge(requestFixture(), {
      email: 'person@example.com',
      rememberMe: false,
    });

    expect(result).toEqual(expect.objectContaining({
      challengeId: 'active-challenge',
      deliveryRequired: false,
    }));
    expect(challengeCreate).not.toHaveBeenCalled();
  });

  it('accepts throttled requests generically without creating or delivering a challenge', async () => {
    challengeCount.mockResolvedValue(20);

    const result = await createEmailAuthChallenge(requestFixture(), {
      email: 'person@example.com',
      rememberMe: false,
    });

    expect(result).toEqual(expect.objectContaining({
      accepted: true,
      challengeId: '',
      deliveryRequired: false,
    }));
    expect(challengeCreate).not.toHaveBeenCalled();
  });

  it('rejects challenges excluded by the active expiry query with the generic failure', async () => {
    challengeFindOne.mockReturnValue(challengeQuery(null));

    await expect(verifyEmailAuthChallenge(requestFixture(), {
      challengeId: 'expired-challenge',
      code: '123456',
    })).rejects.toMatchObject({
      message: 'The email code or secure link is invalid or expired',
      code: 'EMAIL_CODE_INVALID',
    } as Partial<EmailAuthError>);
    expect(challengeFindOne).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: 'expired-challenge',
      expiresAt: { $gt: expect.any(Date) },
    }));
  });

  it('consumes a valid code exactly once for an existing account', async () => {
    const req = requestFixture();
    const created = await createEmailAuthChallenge(req, {
      email: 'person@example.com',
      rememberMe: false,
    });
    const stored = challengeCreate.mock.calls[0][0];
    const challenge = {
      _id: 'record-1',
      ...stored,
      userId: 'user-1',
      attempts: 0,
      maximumAttempts: 5,
    };
    challengeFindOne.mockReturnValue(challengeQuery(challenge));
    userFindById.mockResolvedValue({ _id: 'user-1', username: 'person', isActive: 'yes' });
    challengeFindOneAndUpdate
      .mockReturnValueOnce(challengeQuery(challenge))
      .mockReturnValueOnce(challengeQuery(null));

    const result = await verifyEmailAuthChallenge(req, {
      challengeId: created.challengeId,
      code: created.code,
    });

    expect(result.kind).toBe('existing');
    expect(challengeFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ consumedAt: null, expiresAt: { $gt: expect.any(Date) } }),
      expect.objectContaining({ $set: expect.objectContaining({ consumedAt: expect.any(Date) }) }),
      { returnDocument: 'before' }
    );
    await expect(verifyEmailAuthChallenge(req, {
      challengeId: created.challengeId,
      code: created.code,
    })).rejects.toMatchObject({
      code: 'EMAIL_CODE_INVALID',
    } as Partial<EmailAuthError>);
  });

  it('counts invalid attempts and returns the same generic failure', async () => {
    const challenge = {
      _id: 'record-1',
      challengeId: 'challenge-1',
      email: 'person@example.com',
      codeHash: 'a'.repeat(64),
      linkTokenHash: 'b'.repeat(64),
      attempts: 4,
      maximumAttempts: 5,
      createDate: new Date(),
      resendAvailableAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    };
    challengeFindOne.mockReturnValue(challengeQuery(challenge));

    await expect(verifyEmailAuthChallenge(requestFixture(), {
      challengeId: 'challenge-1',
      code: '000000',
    })).rejects.toMatchObject({
      message: 'The email code or secure link is invalid or expired',
      code: 'EMAIL_CODE_INVALID',
    } as Partial<EmailAuthError>);
    expect(challengeUpdateOne).toHaveBeenCalledWith(
      { _id: 'record-1', consumedAt: null },
      expect.objectContaining({
        $inc: { attempts: 1 },
        $set: { supersededAt: expect.any(Date) },
      })
    );
  });

  it('creates a verified passwordless account only after ownership verification', async () => {
    const req = requestFixture();
    const created = await createEmailAuthChallenge(req, {
      email: 'new@example.com',
      rememberMe: true,
      returnPath: '/',
    });
    const stored = challengeCreate.mock.calls[0][0];
    const initialChallenge = {
      _id: 'record-new',
      ...stored,
      attempts: 0,
      maximumAttempts: 5,
    };
    challengeFindOne.mockReturnValue(challengeQuery(initialChallenge));
    let completionHash = '';
    challengeFindOneAndUpdate.mockImplementation((_query, update) => {
      completionHash = update?.$set?.completionTokenHash || completionHash;
      return challengeQuery({ ...initialChallenge, verifiedAt: new Date(), completionTokenHash: completionHash });
    });

    const verified = await verifyEmailAuthChallenge(req, {
      challengeId: created.challengeId,
      linkToken: created.linkToken,
    });
    expect(verified.kind).toBe('new');
    if (verified.kind !== 'new') throw new Error('Expected new-account completion');

    const verifiedChallenge = {
      ...initialChallenge,
      verifiedAt: new Date(),
      completionTokenHash: completionHash,
    };
    challengeFindOne.mockReturnValue(challengeQuery(verifiedChallenge));
    challengeFindOneAndUpdate.mockReturnValue(challengeQuery(verifiedChallenge));
    const savedUser = {
      _id: 'user-new',
      username: 'new_person',
      roles: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    userCreate.mockResolvedValue(savedUser);
    accountCreate.mockResolvedValue({ _id: 'account-new' });

    const completed = await completeEmailAuthSignup(req, {
      challengeId: created.challengeId,
      completionToken: verified.completionToken,
      username: 'new_person',
    });

    expect(completed.user).toBe(savedUser);
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'new@example.com',
      passwordLoginDisabled: true,
    }));
    expect(accountCreate).toHaveBeenCalledWith(expect.objectContaining({ isVerified: 'yes' }));
    expect(savedUser.roles.account).toBe('account-new');
  });
});
