import API_BASE_URL from '../api/baseUrl';
import type { RealtimeChannel, RealtimeChannelOptions, RealtimeEvent } from '../../types/realtime';

const DEFAULT_REALTIME_EVENTS_PATH = '/realtime/events';

function parseRealtimeEvent(data: unknown): RealtimeEvent {
  const timestamp = new Date().toISOString();

  if (typeof data !== 'string') {
    return {
      type: 'message',
      timestamp,
      data,
    };
  }

  try {
    const parsed = JSON.parse(data) as Partial<RealtimeEvent>;

    return {
      type: typeof parsed.type === 'string' ? parsed.type : 'message',
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : timestamp,
      requestId:
        typeof parsed.requestId === 'string' || parsed.requestId === null
          ? parsed.requestId
          : undefined,
      data: parsed.data,
    };
  } catch (_error) {
    return {
      type: 'message',
      timestamp,
      data,
    };
  }
}

function getEventSourceConstructor(): typeof EventSource | null {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return null;
  }

  return window.EventSource;
}

export function createRealtimeChannel(options: RealtimeChannelOptions = {}): RealtimeChannel {
  const eventsUrl = options.url || `${API_BASE_URL}${DEFAULT_REALTIME_EVENTS_PATH}`;
  let eventSource: EventSource | null = null;

  return {
    connect: () => {
      if (eventSource) {
        return;
      }

      const EventSourceConstructor = getEventSourceConstructor();
      if (!EventSourceConstructor) {
        return;
      }

      eventSource = new EventSourceConstructor(eventsUrl, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        options.onOpen?.();
      };

      eventSource.onerror = (event) => {
        options.onError?.(event);
      };

      eventSource.onmessage = (event) => {
        options.onEvent?.(parseRealtimeEvent(event.data));
      };
    },
    disconnect: () => {
      if (!eventSource) {
        return;
      }

      eventSource.close();
      eventSource = null;
    },
    isConnected: () => eventSource !== null,
  };
}

export default createRealtimeChannel;
