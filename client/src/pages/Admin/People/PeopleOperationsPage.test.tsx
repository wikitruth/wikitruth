import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../../test-utils/render';
import adminApi from '../../../services/api/admin';
import PeopleOperationsPage from './PeopleOperationsPage';

jest.mock('../../../services/api/admin', () => ({
  __esModule: true,
  default: {
    people: jest.fn(),
    previewPeopleAction: jest.fn(),
    runPeopleAction: jest.fn(),
  },
}));

const mockedAdminApi = adminApi as jest.Mocked<typeof adminApi>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedAdminApi.people.mockResolvedValue({
    success: true,
    items: [{
      id: 'user-1', username: 'new-account', email: 'new@example.test', name: 'New Account',
      state: 'needs_review', reason: '', verified: false, roles: {}, timeCreated: '2026-08-01T00:00:00.000Z',
      contributionCount: 0, activeSessions: 2, activePasskeys: 0, activeApiClients: 0,
      lastSeen: null, signals: ['likely_spam', 'no_activity'], canUndo: false,
    }],
    total: 1, page: 1, limit: 25, pages: 1,
    summary: { needsReview: 1, quarantined: 0, noActivity: 1, recentlyJoined: 1 }, filters: {},
  });
  mockedAdminApi.previewPeopleAction.mockResolvedValue({
    success: true, previewToken: 'signed-preview', expiresAt: '2026-08-04T00:05:00.000Z', action: 'quarantine',
    targets: [{ id: 'user-1', username: 'new-account', email: 'new@example.test', activeSessions: 2, retainedContributions: 0, blockers: [] }],
    blockerCount: 0,
  });
  mockedAdminApi.runPeopleAction.mockResolvedValue({
    success: true, action: 'quarantine', actionId: 'action-1', affected: 1, revokedSessions: 2,
    undoUntil: '2026-08-11T00:00:00.000Z',
  });
});

it('filters accounts and previews a reversible quarantine before applying it', async () => {
  const user = userEvent.setup();
  render(<PeopleOperationsPage />);

  expect(await screen.findByText('New Account')).toBeInTheDocument();
  expect(screen.getByText('likely spam')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText(/account state/i), 'needs_review');
  await user.click(screen.getByRole('button', { name: /apply/i }));
  await waitFor(() => expect(mockedAdminApi.people).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'needs_review' })));

  await user.click(screen.getByRole('checkbox', { name: /select new-account/i }));
  await user.click(screen.getByRole('button', { name: /preview action/i }));
  expect(await screen.findByRole('dialog', { name: /preview quarantine/i })).toBeInTheDocument();
  expect(screen.getByText(/content retained/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /confirm quarantine/i })).toBeDisabled();

  await user.type(screen.getByLabelText(/reason/i), 'Automated signup pattern and no activity');
  await user.click(screen.getByRole('button', { name: /confirm quarantine/i }));
  await waitFor(() => expect(mockedAdminApi.runPeopleAction).toHaveBeenCalledWith('signed-preview', 'Automated signup pattern and no activity'));
  expect(await screen.findByText(/restore is available until/i)).toBeInTheDocument();
});

