import fs from 'fs';
import path from 'path';

import config from '../config/config';
import { verifyPrivilegedEventChain } from './entryEventsService';
import { getEmailDeliveryWorkerHealth } from './emailDeliveryWorker';
import { listBackupSnapshots } from './backupSnapshotService';

export type HealthStatus = 'healthy' | 'attention' | 'unavailable' | 'unknown';

type CountModel = {
  countDocuments: (criteria: Record<string, unknown>) => Promise<number>;
  findOne?: (criteria: Record<string, unknown>) => {
    sort: (sort: Record<string, 1 | -1>) => { lean: () => Promise<Record<string, unknown> | null> };
  };
};

export type SystemHealthModels = {
  EmailOutbox?: CountModel;
  NotificationOutbox?: CountModel;
};

export type SystemHealthConnection = {
  readyState?: number;
  db?: {
    admin: () => { command: (command: Record<string, unknown>) => Promise<Record<string, unknown>> };
  };
};

function status(message: HealthStatus, summary: string, detail?: Record<string, unknown>) {
  return { status: message, summary, ...(detail ? { detail } : {}) };
}

function packageIdentity(): { version: string; commit: string } {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as { version?: unknown };
    return {
      version: String(pkg.version || ''),
      commit: String(process.env.RELEASE_SHA || process.env.GIT_COMMIT || process.env.COMMIT_SHA || '').trim(),
    };
  } catch (_error) {
    return { version: '', commit: '' };
  }
}

function storageHealth(): ReturnType<typeof status> {
  try {
    const stats = fs.statfsSync(process.cwd());
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    const freePercent = totalBytes > 0 ? freeBytes / totalBytes * 100 : 0;
    const needsAttention = freeBytes < 1024 * 1024 * 1024 || freePercent < 10;
    return status(needsAttention ? 'attention' : 'healthy', needsAttention ? 'Disk space is running low.' : 'Disk capacity is available.', {
      totalBytes, freeBytes, freePercent: Number(freePercent.toFixed(1)),
    });
  } catch (_error) {
    return status('unknown', 'Disk capacity could not be read.');
  }
}

async function externalEndpointHealth(): Promise<ReturnType<typeof status>> {
  const configured = String(config.homeUrl || '').trim();
  if (!configured) return status('unknown', 'No canonical public endpoint is configured.');
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname))) {
      return status('unknown', 'The configured public endpoint is not eligible for a safe probe.', { origin: url.origin });
    }
    const startedAt = Date.now();
    const response = await fetch(url.origin, {
      method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(3000),
      headers: { 'user-agent': 'Wikitruth-System-Health/1.0' },
    });
    const reachable = response.status > 0 && response.status < 500;
    return status(reachable ? 'healthy' : 'attention', reachable ? 'The canonical endpoint responded.' : 'The canonical endpoint returned an error.', {
      origin: url.origin, httpStatus: response.status, responseTimeMs: Date.now() - startedAt,
    });
  } catch (_error) {
    return status('unavailable', 'The canonical endpoint did not respond within the health-check window.', { origin: configured });
  }
}

async function queueHealth(model: CountModel | undefined, kind: 'email' | 'notification') {
  if (!model) return status('unknown', `${kind === 'email' ? 'Email' : 'Notification'} queue model is unavailable.`);
  const [queued, processing, failed] = await Promise.all([
    model.countDocuments({ status: 'queued' }),
    model.countDocuments({ status: 'processing' }),
    model.countDocuments({ status: 'failed' }),
  ]);
  const oldest = model.findOne && queued > 0
    ? await model.findOne({ status: 'queued' }).sort({ createDate: 1 }).lean()
    : null;
  const oldestQueuedAt = oldest?.createDate ? new Date(oldest.createDate as string | number | Date).toISOString() : null;
  const delayed = oldestQueuedAt ? Date.now() - new Date(oldestQueuedAt).getTime() > 60 * 60 * 1000 : false;
  return status(failed > 0 || delayed ? 'attention' : 'healthy', failed > 0
    ? `${failed} failed ${kind} delivery record${failed === 1 ? '' : 's'} require review.`
    : delayed ? `The oldest queued ${kind} delivery has waited over one hour.`
      : `${kind === 'email' ? 'Email' : 'Notification'} delivery queue is within normal bounds.`,
  { queued, processing, failed, oldestQueuedAt });
}

export async function buildAdminSystemHealth(options: {
  connection: SystemHealthConnection;
  models: SystemHealthModels;
  backupRoot: string;
}) {
  const identity = packageIdentity();
  const application = status('healthy', 'The application process is responding.', {
    version: identity.version || null,
    deployedCommit: identity.commit || null,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryRssBytes: process.memoryUsage().rss,
  });

  let mongo = status('unavailable', 'MongoDB is disconnected.');
  if (options.connection.readyState === 1 && options.connection.db) {
    try {
      const buildInfo = await options.connection.db.admin().command({ buildInfo: 1 });
      mongo = status('healthy', 'MongoDB connection is responding.', { version: String(buildInfo.version || '') || null });
    } catch (_error) {
      mongo = status('attention', 'MongoDB is connected but build information could not be read.');
    }
  }

  const snapshots = listBackupSnapshots(options.backupRoot);
  const latest = snapshots[0] || null;
  const latestAgeMs = latest ? Date.now() - new Date(latest.createdAt).getTime() : null;
  const backup = status(!latest || (latestAgeMs !== null && latestAgeMs > 24 * 60 * 60 * 1000) ? 'attention' : 'healthy',
    latest ? (latestAgeMs !== null && latestAgeMs > 24 * 60 * 60 * 1000 ? 'The latest snapshot is older than 24 hours.' : 'A recent complete snapshot is available.') : 'No complete operational snapshot is available.',
    latest ? {
      latestSnapshotId: latest.id,
      createdAt: latest.createdAt,
      checksum: latest.checksum,
      totalBytes: latest.totalBytes,
      offsiteConfigured: latest.offsite.configured,
      offsiteVerifiedAt: latest.offsite.verifiedAt,
    } : { latestSnapshotId: null },
  );

  const [email, notifications, audit, external] = await Promise.all([
    queueHealth(options.models.EmailOutbox, 'email'),
    queueHealth(options.models.NotificationOutbox, 'notification'),
    verifyPrivilegedEventChain()
      .then((verification) => status(verification.valid ? 'healthy' : 'attention', verification.valid ? 'Privileged audit chain verified.' : 'Privileged audit chain verification failed.', verification as unknown as Record<string, unknown>))
      .catch(() => status('unknown', 'Privileged audit chain could not be verified.')),
    externalEndpointHealth(),
  ]);
  const worker = getEmailDeliveryWorkerHealth();
  const delivery = worker.lastErrorAt && (!worker.lastCompletedAt || worker.lastErrorAt > worker.lastCompletedAt)
    ? status('attention', 'The email worker most recently reported an error.', { ...worker, lastErrorMessage: undefined })
    : email;
  const storage = storageHealth();
  const components = { application, mongo, email: delivery, notifications, storage, backup, audit, external };
  const values = Object.values(components).map((component) => component.status);
  const overall: HealthStatus = values.includes('unavailable') ? 'unavailable'
    : values.includes('attention') ? 'attention'
      : values.includes('unknown') ? 'unknown' : 'healthy';

  return {
    generatedAt: new Date().toISOString(),
    overall,
    components,
    migrationLedger: status('unknown', 'No persisted migration ledger is configured; release checks remain the source of migration evidence.'),
    recentErrors: status('unknown', 'Client monitoring is realtime and not a durable error history; queue failures are reported above.'),
  };
}
