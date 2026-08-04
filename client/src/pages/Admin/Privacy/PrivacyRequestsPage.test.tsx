import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../../test-utils/render';
import adminApi, { type PrivacyRequest } from '../../../services/api/admin';
import PrivacyRequestsPage from './PrivacyRequestsPage';

jest.mock('../../../services/api/admin', () => ({
  __esModule: true,
  default: {
    privacyRequests: jest.fn(), previewPrivacyAnonymization: jest.fn(), runPrivacyRequestAction: jest.fn(),
  },
}));

const mockedAdminApi = adminApi as jest.Mocked<typeof adminApi>;
const approvedRequest: PrivacyRequest = {
  id: 'request-1', reference: 'PR-2026-ABC', type: 'anonymization', status: 'approved',
  requesterUserId: 'user-1', subjectUserId: 'user-1', reason: 'No longer using account',
  subject: { _id: 'user-1', username: 'ada', email: 'ada@example.test', isActive: 'yes', roles: {} },
  legalHold: { active: false, reason: '', changedAt: null }, review: {}, approval: {},
  preview: { generatedAt: null, expiresAt: null, counts: {}, blockers: [] },
  download: { readyAt: null, readyExpiresAt: null, tokenExpiresAt: null, downloadedAt: null },
  execution: {}, timeline: [{ type: 'approved', note: '', actorUserId: 'admin-1', at: '2026-08-04T00:00:00.000Z' }],
  createDate: '2026-08-04T00:00:00.000Z', editDate: '2026-08-04T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAdminApi.privacyRequests.mockResolvedValue([approvedRequest]);
  mockedAdminApi.previewPrivacyAnonymization.mockResolvedValue({
    request: { ...approvedRequest, preview: {
      generatedAt: '2026-08-04T00:00:00.000Z', expiresAt: '2026-08-04T00:10:00.000Z',
      counts: { retainedContributions: 12, activeSessions: 2 }, blockers: [],
    } },
    previewToken: 'preview-token', confirmationPhrase: 'ANONYMIZE ada',
  });
  mockedAdminApi.runPrivacyRequestAction.mockResolvedValue({ ...approvedRequest, status: 'completed' });
});

it('requires a fresh preview and exact confirmation before anonymization', async () => {
  const user = userEvent.setup();
  render(<PrivacyRequestsPage />);

  expect(await screen.findByRole('heading', { name: /privacy requests/i })).toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: 'Review' }));
  expect(screen.getByRole('button', { name: /execute anonymization/i })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /generate preview/i }));
  expect(await screen.findByText(/No execution blockers were found/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /execute anonymization/i })).toBeDisabled();
  await user.type(screen.getByLabelText(/type ANONYMIZE ada/i), 'ANONYMIZE ada');
  const execute = screen.getByRole('button', { name: /execute anonymization/i });
  expect(execute).toBeEnabled();
  await user.click(execute);

  await waitFor(() => expect(mockedAdminApi.runPrivacyRequestAction).toHaveBeenCalledWith('request-1', {
    action: 'execute', note: '', previewToken: 'preview-token', confirmation: 'ANONYMIZE ada',
  }));
});
