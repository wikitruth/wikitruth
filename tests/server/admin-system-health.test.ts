const verifyPrivilegedEventChain = jest.fn();
const getEmailDeliveryWorkerHealth = jest.fn();
const listBackupSnapshots = jest.fn();

jest.mock('../../server/src/services/entryEventsService', () => ({
  verifyPrivilegedEventChain: (...args: unknown[]) => verifyPrivilegedEventChain(...args),
}));
jest.mock('../../server/src/services/emailDeliveryWorker', () => ({
  getEmailDeliveryWorkerHealth: (...args: unknown[]) => getEmailDeliveryWorkerHealth(...args),
}));
jest.mock('../../server/src/services/backupSnapshotService', () => ({
  listBackupSnapshots: (...args: unknown[]) => listBackupSnapshots(...args),
}));
jest.mock('../../server/src/config/config', () => ({ homeUrl: 'https://wikitruth.example' }));

import { buildAdminSystemHealth } from '../../server/src/services/adminSystemHealthService';

function queueModel(counts: Record<string, number>, oldest: Record<string, unknown> | null = null) {
  return {
    countDocuments: async (criteria: Record<string, unknown>) => counts[String(criteria.status || '')] || 0,
    findOne: () => ({ sort: () => ({ lean: async () => oldest }) }),
  };
}

describe('admin system health', () => {
  beforeEach(() => {
    verifyPrivilegedEventChain.mockResolvedValue({ valid: true, verifiedEvents: 4, legacyEvents: 0 });
    getEmailDeliveryWorkerHealth.mockReturnValue({
      enabled: true, scheduled: true, running: false, lastStartedAt: null,
      lastCompletedAt: null, lastErrorAt: null, lastErrorMessage: '',
    });
    listBackupSnapshots.mockReturnValue([{
      id: 'snapshot-1', createdAt: new Date().toISOString(), checksum: 'checksum', totalBytes: 100,
      offsite: { configured: true, verifiedAt: null },
    }]);
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });
  });

  it('reports measured application, database, queue, backup, audit, storage and endpoint states', async () => {
    const health = await buildAdminSystemHealth({
      connection: {
        readyState: 1,
        db: { admin: () => ({ command: async () => ({ version: '8.0.0' }) }) },
      },
      models: {
        EmailOutbox: queueModel({ queued: 2, processing: 0, failed: 0 }),
        NotificationOutbox: queueModel({ queued: 0, processing: 0, failed: 0 }),
      },
      backupRoot: '/tmp/backups',
    });

    expect(health.components.mongo).toMatchObject({ status: 'healthy', detail: { version: '8.0.0' } });
    expect(health.components.email).toMatchObject({ status: 'healthy', detail: { queued: 2 } });
    expect(health.components.backup).toMatchObject({ status: 'healthy' });
    expect(health.components.audit).toMatchObject({ status: 'healthy' });
    expect(health.components.external).toMatchObject({ status: 'healthy', detail: { httpStatus: 200 } });
    expect(health.migrationLedger.status).toBe('unknown');
    expect(health.recentErrors.status).toBe('unknown');
  });

  it('raises attention for failed deliveries without exposing worker error text', async () => {
    getEmailDeliveryWorkerHealth.mockReturnValue({
      enabled: true, scheduled: true, running: false, lastStartedAt: null,
      lastCompletedAt: '2026-08-03T00:00:00.000Z', lastErrorAt: '2026-08-04T00:00:00.000Z',
      lastErrorMessage: 'sensitive provider response',
    });
    const health = await buildAdminSystemHealth({
      connection: { readyState: 0 },
      models: { EmailOutbox: queueModel({ queued: 0, processing: 0, failed: 1 }) },
      backupRoot: '/tmp/backups',
    });

    expect(health.overall).toBe('unavailable');
    expect(health.components.email.status).toBe('attention');
    expect(JSON.stringify(health)).not.toContain('sensitive provider response');
  });
});
