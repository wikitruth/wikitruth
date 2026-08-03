import express from 'express';
import request from 'supertest';

const mockListProviders = jest.fn();
const mockSettings = jest.fn();
const mockTemplates = jest.fn();
const mockDeliveries = jest.fn();
const mockResolveProvider = jest.fn();
const mockQueueAndDeliver = jest.fn();

jest.mock('../../server/src/app', () => ({
  __esModule: true,
  default: { db: { models: { Account: { findById: () => ({ lean: async () => ({ isVerified: 'yes' }) }) } } } },
}));
jest.mock('../../server/src/services/emailProviderStore', () => ({
  listEmailProviders: mockListProviders,
  getEmailOperationsSettings: mockSettings,
  getStoredEmailProvider: jest.fn(),
  readEmailProviderSecrets: jest.fn(),
  activateEmailProvider: jest.fn(),
  removeEmailProvider: jest.fn(),
  saveEmailOperationsSettings: jest.fn(),
  saveEmailProvider: jest.fn(),
  setEmailProviderEnabled: jest.fn(),
  updateEmailProviderVerification: jest.fn(),
}));
jest.mock('../../server/src/services/emailCatalog', () => ({
  listEmailTemplates: mockTemplates,
  SYNTHETIC_EMAIL_FIXTURE: { projectName: 'Wikitruth' },
  renderEmailTemplate: jest.fn(() => ({ subject: 'Preview subject', html: '<p>Preview</p>', text: 'Preview' })),
}));
jest.mock('../../server/src/services/emailOutboxService', () => ({
  listRecentEmailDeliveries: mockDeliveries,
  queueAndDeliverEmail: mockQueueAndDeliver,
  retryEmailDelivery: jest.fn(),
}));
jest.mock('../../server/src/services/emailTransport', () => ({
  resolveEmailProvider: mockResolveProvider,
  sendEmailWithProvider: jest.fn(),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({ logEntryEvent: jest.fn() }));
jest.mock('../../server/src/services/webAuthnConfigService', () => ({
  getWebAuthnConfig: () => ({ canonicalOrigin: 'https://wikitruth.example' }),
}));

import { registerAdminEmailOperationsRoutes } from '../../server/src/controllers/api/adminEmailOperationsRoutes';

function app(admin = true) {
  const server = express();
  server.use(express.json());
  server.use((req, _res, next) => {
    (req as express.Request & { user?: Record<string, unknown> }).user = {
      _id: 'admin-1', username: 'root', email: 'admin@example.test', roles: { account: 'account-1' },
    };
    next();
  });
  const router = express.Router();
  registerAdminEmailOperationsRoutes(router, (_req, res) => {
    if (admin) return true;
    res.status(403).json({ success: false });
    return false;
  });
  server.use('/api/admin', router);
  return server;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListProviders.mockReturnValue([{ id: 'provider-1', name: 'Resend', secretConfigured: true }]);
  mockSettings.mockReturnValue({ contactRecipient: 't***@example.test' });
  mockTemplates.mockReturnValue([{ key: 'welcome', name: 'Welcome', purpose: 'Welcome', sampleSubject: 'Welcome' }]);
  mockDeliveries.mockResolvedValue([{ id: 'delivery-1', recipientMasked: 'a***@example.test' }]);
  mockResolveProvider.mockReturnValue({
    source: 'admin', provider: { id: 'provider-1', name: 'Resend', type: 'resend' }, secrets: { apiKey: 'never-return' },
  });
  mockQueueAndDeliver.mockResolvedValue({ providerMessageId: 'email_1' });
});

it('returns masked operational state without provider credentials', async () => {
  const response = await request(app()).get('/api/admin/email-operations').expect(200);
  expect(response.body.providers[0]).toMatchObject({ secretConfigured: true });
  expect(response.body.deliveries[0].recipientMasked).toBe('a***@example.test');
  expect(JSON.stringify(response.body)).not.toContain('never-return');
});

it('requires administrator access for previews', async () => {
  await request(app(false)).get('/api/admin/email-operations/templates/welcome/preview').expect(403);
});

it('sends tests only to the verified current administrator email', async () => {
  await request(app()).post('/api/admin/email-operations/test').send({ templateKey: 'welcome' }).expect(202);
  expect(mockQueueAndDeliver).toHaveBeenCalledWith(expect.objectContaining({
    templateKey: 'welcome', to: 'admin@example.test', test: true, actorUserId: 'admin-1',
  }));
});
