import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../test-utils/render';
import privacyApi from '../../services/api/privacy';
import PrivacyPage from './PrivacyPage';

jest.mock('../../services/api/privacy', () => ({
  __esModule: true,
  default: {
    requests: jest.fn(), createRequest: jest.fn(), cancelRequest: jest.fn(), downloadExport: jest.fn(),
  },
}));

const mockedPrivacyApi = privacyApi as jest.Mocked<typeof privacyApi>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrivacyApi.requests.mockResolvedValue([]);
  mockedPrivacyApi.createRequest.mockResolvedValue({
    id: 'request-1', reference: 'PR-2026-ABC', type: 'export', status: 'submitted',
    requesterUserId: 'user-1', subjectUserId: 'user-1', reason: '', subject: null,
    legalHold: { active: false, reason: '', changedAt: null }, review: {}, approval: {},
    preview: { generatedAt: null, expiresAt: null, counts: {}, blockers: [] },
    download: { readyAt: null, readyExpiresAt: null, tokenExpiresAt: null, downloadedAt: null },
    execution: {}, timeline: [], createDate: '2026-08-04T00:00:00.000Z', editDate: '2026-08-04T00:00:00.000Z',
  });
});

it('offers a clear, reviewable self-service export request flow', async () => {
  const user = userEvent.setup();
  render(<PrivacyPage />);

  expect(await screen.findByRole('heading', { name: /privacy & data/i })).toBeInTheDocument();
  expect(await screen.findByText(/have not submitted a privacy request/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /request an export/i }));
  expect(screen.getByRole('dialog', { name: /request a data export/i })).toBeInTheDocument();
  await user.type(screen.getByLabelText(/anything the reviewer should know/i), 'Please include my activity.');
  await user.click(screen.getByRole('button', { name: /submit request/i }));

  await waitFor(() => expect(mockedPrivacyApi.createRequest).toHaveBeenCalledWith('export', 'Please include my activity.'));
  expect(await screen.findByText(/PR-2026-ABC was submitted/i)).toBeInTheDocument();
});
