import appModForDb from '../app';
import * as flowUtils from '../utils/flowUtils';
import {
  type SystemHealthConnection,
  type SystemHealthModels,
  buildAdminSystemHealth,
} from './adminSystemHealthService';
import { captureHealthSnapshot, recordOperationalEvent } from './operationalTelemetryService';

let timer: NodeJS.Timeout | null = null;
let running = false;
let lastCompletedAt: Date | null = null;
let lastErrorAt: Date | null = null;

export async function runOperationalHealthCycle(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const appDb = (appModForDb as unknown as { db: SystemHealthConnection & { models: SystemHealthModels } }).db;
    const health = await buildAdminSystemHealth({
      connection: appDb,
      models: appDb.models,
      backupRoot: flowUtils.getBackupDir(),
    });
    await captureHealthSnapshot(health);
    lastCompletedAt = new Date();
  } catch (error) {
    lastErrorAt = new Date();
    await recordOperationalEvent({
      kind: 'health_worker_error', severity: 'error', source: 'operational-health-worker',
      code: error instanceof Error ? error.name : 'unknown', message: 'Periodic health capture failed',
    }).catch(() => undefined);
  } finally {
    running = false;
  }
}

export function startOperationalHealthWorker(): void {
  if (timer || process.env.NODE_ENV === 'test') return;
  void runOperationalHealthCycle();
  timer = setInterval(() => void runOperationalHealthCycle(), 5 * 60 * 1000);
  timer.unref();
}

export function stopOperationalHealthWorker(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export function getOperationalHealthWorkerState() {
  return {
    scheduled: Boolean(timer), running,
    lastCompletedAt: lastCompletedAt?.toISOString() || null,
    lastErrorAt: lastErrorAt?.toISOString() || null,
  };
}
