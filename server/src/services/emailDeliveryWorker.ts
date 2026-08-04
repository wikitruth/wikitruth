import { queueDueNotificationDigests } from './emailDigestService';
import { processEmailOutboxBatch } from './emailOutboxService';

let timer: NodeJS.Timeout | null = null;
let running = false;
let lastStartedAt: Date | null = null;
let lastCompletedAt: Date | null = null;
let lastErrorAt: Date | null = null;
let lastErrorMessage = '';

export async function runEmailDeliveryCycle(): Promise<void> {
  if (running) return;
  running = true;
  lastStartedAt = new Date();
  try {
    await queueDueNotificationDigests();
    await processEmailOutboxBatch(20);
    lastCompletedAt = new Date();
    lastErrorMessage = '';
  } catch (error) {
    lastErrorAt = new Date();
    lastErrorMessage = error instanceof Error ? error.message : String(error);
    console.error('Email delivery cycle failed:', error);
  } finally {
    running = false;
  }
}

export function getEmailDeliveryWorkerHealth() {
  return {
    enabled: process.env.NODE_ENV !== 'test',
    scheduled: Boolean(timer),
    running,
    lastStartedAt: lastStartedAt?.toISOString() || null,
    lastCompletedAt: lastCompletedAt?.toISOString() || null,
    lastErrorAt: lastErrorAt?.toISOString() || null,
    lastErrorMessage,
  };
}

export function startEmailDeliveryWorker(): void {
  if (timer || process.env.NODE_ENV === 'test') return;
  void runEmailDeliveryCycle();
  timer = setInterval(() => void runEmailDeliveryCycle(), 5_000);
  timer.unref();
}

export function stopEmailDeliveryWorker(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
