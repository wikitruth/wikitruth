import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../../test-utils/render';
import adminApi from '../../../services/api/admin';
import DBBackupPage from './DBBackupPage';

jest.mock('../../../services/api/admin', () => ({
  __esModule: true,
  default: {
    systemHealth: jest.fn(), dbBackupStatus: jest.fn(), runDbBackup: jest.fn(),
    previewDbRestore: jest.fn(), runDbRestore: jest.fn(),
    operationalTelemetry: jest.fn(), updateOperationalAlert: jest.fn(), updateOperationalAlertRule: jest.fn(),
  },
}));

const mockedAdminApi = adminApi as jest.Mocked<typeof adminApi>;
const snapshot = {
  id: '2026-08-04T00-00-00-000Z-12345678', kind: 'manual' as const,
  createdAt: '2026-08-04T00:00:00.000Z', complete: true, totalDocuments: 42, totalBytes: 2048,
  checksum: 'sha256', summary: { public: { topics: 40 }, private: { users: 2 } },
  offsite: { configured: false, verifiedAt: null, reference: '' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAdminApi.systemHealth.mockResolvedValue({ success: true, health: {
    generatedAt: '2026-08-04T00:00:00.000Z', overall: 'attention',
    components: {
      application: { status: 'healthy', summary: 'Application process is running.', detail: { version: '0.5.2', deployedCommit: 'abc123' } },
      mongo: { status: 'healthy', summary: 'MongoDB responded.', detail: { version: '8.0.0' } },
      email: { status: 'attention', summary: 'One delivery failed.', detail: { queued: 0, failed: 1 } },
      notifications: { status: 'healthy', summary: 'Queue is clear.' }, storage: { status: 'healthy', summary: 'Storage is available.' },
      backup: { status: 'attention', summary: 'Off-site copy is not verified.' },
    },
    migrationLedger: { status: 'unknown', summary: 'No migration ledger is configured.' },
    recentErrors: { status: 'unknown', summary: 'No structured client error source is configured.' },
  } });
  mockedAdminApi.dbBackupStatus.mockResolvedValue({ success: true, backup: { hasGitBackup: false, snapshotCount: 1, latestSnapshot: snapshot, snapshots: [snapshot] } });
  mockedAdminApi.previewDbRestore.mockResolvedValue({ success: true, preview: {
    snapshot, verification: { valid: true, checkedAt: '2026-08-04T00:01:00.000Z', expectedChecksum: 'sha256', actualChecksum: 'sha256' },
    isolatedRestoreTest: { supported: true, valid: true, testedAt: '2026-08-04T00:01:00.000Z', message: 'Isolated restore test passed.', collections: { topics: 40, users: 2 } },
    comparison: [{ collection: 'topics', current: 39, snapshot: 40, change: 1, scope: 'public' }],
    confirmationPhrase: `RESTORE ${snapshot.id}`, automaticPreRestoreSnapshot: true,
    expiresAt: '2026-08-04T00:06:00.000Z', token: 'signed-restore-preview',
  } });
  mockedAdminApi.runDbRestore.mockResolvedValue({ success: true, message: 'Restored', restore: {
    restorePublicData: true, restorePrivateData: true, snapshotId: snapshot.id,
    preRestoreSnapshotId: 'pre-restore-1', completedAt: '2026-08-04T00:02:00.000Z', summary: {},
  } });
  mockedAdminApi.operationalTelemetry.mockResolvedValue({
    events: [{ _id: 'event-1', kind: 'api_error', severity: 'error', source: 'express-api', code: 'INTERNAL_ERROR', fingerprint: 'hash', message: 'Sanitized failure', path: '/api/topics/:id', requestId: 'req-1', occurredAt: '2026-08-04T00:00:00.000Z' }],
    history: [{ _id: 'health-1', overall: 'healthy', generatedAt: '2026-08-04T00:00:00.000Z', components: [] }],
    alerts: [{ _id: 'alert-1', ruleId: 'rule-1', status: 'active', severity: 'critical', title: 'Repeated server errors', summary: 'Threshold 5; observed 6.', occurrenceCount: 2, firstTriggeredAt: '2026-08-04T00:00:00.000Z', lastTriggeredAt: '2026-08-04T00:01:00.000Z' }],
    rules: [{ _id: 'rule-1', name: 'Repeated server errors', enabled: true, source: 'events', metric: 'api_error', threshold: 5, windowMinutes: 15, cooldownMinutes: 30, severity: 'critical', builtIn: true }],
    retention: { eventsDays: 30, healthDays: 90, alertsDays: 180 },
  });
});

it('shows bounded health history, active alerts, sanitized events, and configurable rules', async () => {
  const user = userEvent.setup();
  render(<DBBackupPage />);
  await screen.findByRole('heading', { name: /system operations/i });
  await user.click(screen.getByRole('tab', { name: /events & alerts/i }));

  expect(await screen.findByRole('heading', { name: /health history/i })).toBeInTheDocument();
  expect(screen.getByText('Repeated server errors')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: /recent events/i }));
  expect(screen.getByText('Sanitized failure')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: /alert rules/i }));
  expect(screen.getByLabelText(/repeated server errors threshold/i)).toHaveValue(5);
});

it('shows measured health and requires a verified restore preview plus exact confirmation', async () => {
  const user = userEvent.setup();
  render(<DBBackupPage />);

  expect(await screen.findByRole('heading', { name: /system operations/i })).toBeInTheDocument();
  expect((await screen.findAllByText('One delivery failed.')).length).toBeGreaterThan(0);
  await user.click(screen.getByRole('tab', { name: /backups/i }));
  expect(screen.getByText(snapshot.id)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /preview restore/i }));

  expect(await screen.findByRole('dialog', { name: /restore preview/i })).toBeInTheDocument();
  expect(screen.getByText(/checksum verified/i)).toBeInTheDocument();
  const restoreButton = screen.getByRole('button', { name: /restore snapshot/i });
  expect(restoreButton).toBeDisabled();
  await user.type(screen.getByLabelText(/type restore/i), `RESTORE ${snapshot.id}`);
  expect(restoreButton).toBeEnabled();
  await user.click(restoreButton);
  await waitFor(() => expect(mockedAdminApi.runDbRestore).toHaveBeenCalledWith({ snapshotId: snapshot.id, previewToken: 'signed-restore-preview', confirmText: `RESTORE ${snapshot.id}` }));
  expect(await screen.findByText(/automatic rollback snapshot/i)).toBeInTheDocument();
});
