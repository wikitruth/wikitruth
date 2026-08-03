import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import emailOperationsApi from '../../../services/api/emailOperations';
import EmailOperationsPage from './EmailOperationsPage';

jest.mock('../../../services/api/emailOperations', () => ({
  __esModule: true,
  default: {
    summary: jest.fn(),
    preview: jest.fn(),
    createProvider: jest.fn(),
    updateProvider: jest.fn(),
    verifyProvider: jest.fn(),
    activateProvider: jest.fn(),
    setProviderEnabled: jest.fn(),
    removeProvider: jest.fn(),
    saveSettings: jest.fn(),
    sendTest: jest.fn(),
    retryDelivery: jest.fn(),
  },
}));

const api = emailOperationsApi as jest.Mocked<typeof emailOperationsApi>;
const summary = {
  success: true,
  effectiveProvider: { configured: true, source: 'admin' as const, id: 'provider-1', name: 'Primary Resend', type: 'resend' },
  settings: { contactRecipient: 'team@example.test' },
  providers: [{
    id: 'provider-1', name: 'Primary Resend', type: 'resend' as const, enabled: true, active: true,
    fromName: 'Wikitruth', fromAddress: 'hello@example.test', secretConfigured: true,
    webhookSecretConfigured: true, verifiedAt: '2026-08-04T00:00:00.000Z', editDate: '2026-08-04T00:00:00.000Z',
  }],
  templates: [
    { key: 'sign_in_code', name: 'Sign-in code', purpose: 'Passwordless sign-in.', sampleSubject: '482913 is your code' },
    { key: 'welcome', name: 'Welcome', purpose: 'Welcome a contributor.', sampleSubject: 'Welcome' },
  ],
  deliveries: [{
    id: 'delivery-1', templateKey: 'welcome', recipientMasked: 'a***@example.test', status: 'delivered' as const,
    providerName: 'Primary Resend', providerType: 'resend', providerMessageId: 'email_1', attempts: 1,
    maxAttempts: 4, availableAt: '2026-08-04T00:00:00.000Z', deliveredAt: '2026-08-04T00:00:01.000Z',
    test: true, lastError: '', errorCode: '', createDate: '2026-08-04T00:00:00.000Z',
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  api.summary.mockResolvedValue(summary);
  api.preview.mockImplementation(async (key) => ({
    success: true, key, synthetic: true, subject: `${key} subject`, html: `<p>${key}</p>`, text: `${key} text`,
  }));
  api.sendTest.mockResolvedValue({ success: true, recipientMasked: 'a***@example.test' });
});

it('renders provider health, template previews, and masked activity', async () => {
  render(<EmailOperationsPage />);
  expect(await screen.findByRole('heading', { name: /email operations/i })).toBeInTheDocument();
  expect(await screen.findByText(/primary resend is available/i)).toBeInTheDocument();
  expect(screen.getByText('a***@example.test')).toBeInTheDocument();
  expect(await screen.findByText('sign_in_code subject')).toBeInTheDocument();
  expect(screen.getByTitle(/synthetic html preview/i)).toHaveAttribute('sandbox');
});

it('switches templates, sends a test, and opens the provider editor', async () => {
  const user = userEvent.setup();
  render(<EmailOperationsPage />);
  await screen.findByText(/primary resend is available/i);
  await user.click(screen.getByRole('button', { name: /welcome/i }));
  expect(await screen.findByText('welcome subject')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /send test to me/i }));
  await waitFor(() => expect(api.sendTest).toHaveBeenCalledWith('welcome'));
  expect(await screen.findByText(/test sent to your verified administrator email/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /add provider/i }));
  expect(screen.getByRole('heading', { name: /add email provider/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/resend api key/i)).toHaveAttribute('type', 'password');
});
