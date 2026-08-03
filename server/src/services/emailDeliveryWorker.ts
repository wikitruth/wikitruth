import { queueDueNotificationDigests } from './emailDigestService';
import { processEmailOutboxBatch } from './emailOutboxService';

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runEmailDeliveryCycle(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await queueDueNotificationDigests();
    await processEmailOutboxBatch(20);
  } catch (error) {
    console.error('Email delivery cycle failed:', error);
  } finally {
    running = false;
  }
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
