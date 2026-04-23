'use strict';

export interface RealtimeEvent {
  type: string;
  timestamp?: string;
  requestId?: string | null;
  data?: unknown;
}

type RealtimeSubscriber = (event: RealtimeEvent) => void;

const subscribers = new Set<RealtimeSubscriber>();

function subscribeRealtime(subscriber: RealtimeSubscriber): () => void {
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

function publishRealtimeEvent(event: RealtimeEvent): void {
  const normalizedEvent: RealtimeEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  subscribers.forEach((subscriber) => {
    try {
      subscriber(normalizedEvent);
    } catch (_error) {
      // Individual subscriber failures should not break the channel.
    }
  });
}

function getRealtimeSubscriberCount(): number {
  return subscribers.size;
}

export {
  subscribeRealtime,
  publishRealtimeEvent,
  getRealtimeSubscriberCount,
};
