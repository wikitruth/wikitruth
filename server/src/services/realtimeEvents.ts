'use strict';

import type { RealtimeDurableAdapter } from './realtimeAdapter';
import { createMongoRealtimeAdapter } from './realtimeMongoAdapter';

export interface RealtimeEvent {
  type: string;
  timestamp?: string;
  requestId?: string | null;
  data?: unknown;
}

type RealtimeSubscriber = (event: RealtimeEvent) => void;

const subscribers = new Set<RealtimeSubscriber>();
let durableAdapter: RealtimeDurableAdapter | null | undefined;
let unsubscribeDurable: (() => void) | null = null;

function dispatchRealtimeEvent(event: RealtimeEvent): void {
  subscribers.forEach((subscriber) => {
    try {
      subscriber(event);
    } catch (_error) {
      // Individual subscriber failures should not break the channel.
    }
  });
}

function configuredDurableAdapter(): RealtimeDurableAdapter | null {
  const configured = String(process.env.REALTIME_EVENT_ADAPTER || 'memory').trim().toLowerCase();
  return configured === 'mongo' ? createMongoRealtimeAdapter() : null;
}

function ensureDurableAdapter(): RealtimeDurableAdapter | null {
  if (typeof durableAdapter === 'undefined') durableAdapter = configuredDurableAdapter();
  if (durableAdapter && !unsubscribeDurable) unsubscribeDurable = durableAdapter.subscribe(dispatchRealtimeEvent);
  return durableAdapter;
}

function subscribeRealtime(subscriber: RealtimeSubscriber): () => void {
  subscribers.add(subscriber);
  ensureDurableAdapter();

  return () => {
    subscribers.delete(subscriber);
  };
}

function publishRealtimeEvent(event: RealtimeEvent): void {
  const normalizedEvent: RealtimeEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  dispatchRealtimeEvent(normalizedEvent);
  const adapter = ensureDurableAdapter();
  if (adapter) void adapter.publish(normalizedEvent).catch((error) => {
    console.error('Realtime durable adapter publish failed:', error instanceof Error ? error.message : error);
  });
}

function getRealtimeSubscriberCount(): number {
  return subscribers.size;
}

function getRealtimeAdapterName(): string {
  return ensureDurableAdapter()?.name || 'memory';
}

function setRealtimeDurableAdapterForTests(adapter: RealtimeDurableAdapter | null): void {
  unsubscribeDurable?.();
  void durableAdapter?.close?.();
  unsubscribeDurable = null;
  durableAdapter = adapter;
  if (adapter) unsubscribeDurable = adapter.subscribe(dispatchRealtimeEvent);
}

export {
  subscribeRealtime,
  publishRealtimeEvent,
  getRealtimeSubscriberCount,
  getRealtimeAdapterName,
  setRealtimeDurableAdapterForTests,
};
