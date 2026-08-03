import express from 'express';
import request from 'supertest';

const createChallenge = jest.fn();
const verifyChallenge = jest.fn();
const completeSignup = jest.fn();
const setDelivery = jest.fn();
const verifyOwnership = jest.fn();
const establishSession = jest.fn();
const saveSession = jest.fn();
const logEntryEvent = jest.fn();
const queueAndDeliverEmail = jest.fn();
const queueEmail = jest.fn();

jest.mock('../../server/src/services/emailAuthService', () => {
  class EmailAuthError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode = 400, code = 'EMAIL_CODE_INVALID') {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  }
  return {
    EmailAuthError,
    createEmailAuthChallenge: (...args: unknown[]) => createChallenge(...args),
    verifyEmailAuthChallenge: (...args: unknown[]) => verifyChallenge(...args),
    completeEmailAuthSignup: (...args: unknown[]) => completeSignup(...args),
    setEmailChallengeDelivery: (...args: unknown[]) => setDelivery(...args),
    verifyUserEmailOwnership: (...args: unknown[]) => verifyOwnership(...args),
    getEmailAuthConfig: () => ({
      enabled: true,
      codeTtlSeconds: 600,
      maximumAttempts: 5,
      resendDelaySeconds: 60,
      maximumRequestsPerEmailPerHour: 5,
      maximumRequestsPerIpPerHour: 20,
    }),
  };
});
jest.mock('../../server/src/services/authAssuranceService', () => ({
  establishAuthenticatedSession: (...args: unknown[]) => establishSession(...args),
  saveSession: (...args: unknown[]) => saveSession(...args),
}));
jest.mock('../../server/src/services/authHandoffService', () => ({
  createAuthHandoff: jest.fn(),
  listTrustedHandoffOrigins: jest.fn().mockResolvedValue(['https://fix.example']),
}));
jest.mock('../../server/src/services/civicTenantService', () => ({
  getCivicTenantForHost: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args: unknown[]) => logEntryEvent(...args),
}));
jest.mock('../../server/src/services/emailOutboxService', () => ({
  queueAndDeliverEmail: (...args: unknown[]) => queueAndDeliverEmail(...args),
  queueEmail: (...args: unknown[]) => queueEmail(...args),
}));
jest.mock('../../server/src/services/webAuthnConfigService', () => ({
  getWebAuthnConfig: () => ({ canonicalOrigin: 'http://localhost' }),
  isCanonicalAuthOrigin: () => true,
  normalizeTrustedOrigin: (value: unknown) => String(value || ''),
  safeRelativeReturnPath: (value: unknown) => String(value || '/'),
}));
jest.mock('../../server/src/controllers/api/authHelpers', () => ({
  deliverEmail: jest.fn().mockResolvedValue(false),
  getDefaultActiveRole: () => 'contributor',
  isValidEmail: (value: string) => value.includes('@'),
  sanitizeUser: (user: Record<string, unknown>) => ({ _id: user._id, username: user.username }),
  setSessionActiveRole: jest.fn(),
  validateRecaptcha: jest.fn().mockResolvedValue(true),
}));

const { registerAuthEmailCodeRoutes } = require('../../server/src/controllers/api/authEmailCodeRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.app.config = { projectName: 'Wikitruth', smtp: { credentials: { user: '' } } };
    req.session = { preferences: {} } as never;
    req.login = jest.fn((_user, done) => done?.());
    next();
  });
  const router = express.Router();
  registerAuthEmailCodeRoutes(router);
  app.use('/auth', router);
  return app;
}

describe('email-code authentication routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createChallenge.mockResolvedValue({
      accepted: true,
      challengeId: 'challenge-1',
      retryAfterSeconds: 60,
      expiresInSeconds: 600,
      deliveryRequired: true,
      code: '123456',
      linkToken: 'L'.repeat(43),
    });
    establishSession.mockResolvedValue(undefined);
    saveSession.mockResolvedValue(undefined);
    verifyOwnership.mockResolvedValue(undefined);
    logEntryEvent.mockResolvedValue(undefined);
    queueAndDeliverEmail.mockResolvedValue({ providerMessageId: 'email-1' });
    queueEmail.mockResolvedValue({ _id: 'welcome-email-1' });
  });

  it('returns the same generic request response with non-production debug support', async () => {
    const response = await request(createApp()).post('/auth/email-code/request').send({
      email: 'person@example.com',
      rememberMe: true,
      returnPath: '/explore',
    }).expect(202);

    expect(response.body.message).toMatch(/if this address can receive/i);
    expect(response.body.debug.code).toBe('123456');
    expect(createChallenge).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      email: 'person@example.com', rememberMe: true, returnPath: '/explore',
    }));
    expect(setDelivery).toHaveBeenCalledWith('challenge-1', true);
  });

  it('establishes remembered email-code assurance for an existing account', async () => {
    const user = { _id: 'user-1', id: 'user-1', username: 'person', roles: {} };
    verifyChallenge.mockResolvedValue({
      kind: 'existing', user,
      context: { challengeId: 'challenge-1', rememberMe: true, targetOrigin: '', returnPath: '/' },
    });

    const response = await request(createApp()).post('/auth/email-code/verify').send({
      challengeId: 'challenge-1', code: '123456',
    }).expect(200);

    expect(response.body.user.username).toBe('person');
    expect(establishSession).toHaveBeenCalledWith(expect.anything(), user, 'email_code', { rememberMe: true });
    expect(verifyOwnership).toHaveBeenCalledWith(user);
  });

  it('requires username completion and terms only after a new email is verified', async () => {
    verifyChallenge.mockResolvedValue({
      kind: 'new', completionToken: 'completion-token',
      context: { challengeId: 'challenge-1', rememberMe: false, targetOrigin: '', returnPath: '/' },
    });
    const verifyResponse = await request(createApp()).post('/auth/email-code/verify').send({
      challengeId: 'challenge-1', code: '123456',
    }).expect(200);
    expect(verifyResponse.body).toEqual(expect.objectContaining({
      requiresUsername: true, completionToken: 'completion-token',
    }));

    await request(createApp()).post('/auth/email-code/complete').send({
      challengeId: 'challenge-1', completionToken: 'completion-token', username: 'new_person',
    }).expect(400);
    expect(completeSignup).not.toHaveBeenCalled();

    const user = { _id: 'user-2', id: 'user-2', username: 'new_person', roles: {} };
    completeSignup.mockResolvedValue({
      user,
      context: { challengeId: 'challenge-1', rememberMe: false, targetOrigin: '', returnPath: '/' },
    });
    const completeResponse = await request(createApp()).post('/auth/email-code/complete').send({
      challengeId: 'challenge-1', completionToken: 'completion-token', username: 'new_person', agreeToTerms: true,
    }).expect(201);
    expect(completeResponse.body.created).toBe(true);
  });
});
