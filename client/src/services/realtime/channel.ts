import API_BASE_URL from '../api/baseUrl';
import type { RealtimeChannel, RealtimeChannelOptions, RealtimeEvent } from '../../types/realtime';

const DEFAULT_REALTIME_EVENTS_PATH = '/realtime/events';
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 10000;

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
  const reconnectDelayMs = Math.max(250, options.reconnectDelayMs || DEFAULT_RECONNECT_DELAY_MS);
  const maxReconnectDelayMs = Math.max(reconnectDelayMs, options.maxReconnectDelayMs || DEFAULT_MAX_RECONNECT_DELAY_MS);
  let eventSource: EventSource | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempts = 0;
  let disposed = false;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const updateState = (state: 'connecting' | 'connected' | 'error' | 'disconnected') => {
    options.onStateChange?.(state);
  };

  const closeSource = () => {
    if (!eventSource) {
      return;
    }
    eventSource.close();
    eventSource = null;
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) {
      return;
    }

    reconnectAttempts += 1;
    const delay = Math.min(reconnectDelayMs * 2 ** Math.max(0, reconnectAttempts - 1), maxReconnectDelayMs);
    options.onReconnectAttempt?.(reconnectAttempts, delay);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (eventSource || disposed) {
      return;
    }

    const EventSourceConstructor = getEventSourceConstructor();
    if (!EventSourceConstructor) {
      updateState('disconnected');
      return;
    }

    updateState('connecting');
    eventSource = new EventSourceConstructor(eventsUrl, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      reconnectAttempts = 0;
      clearReconnectTimer();
      updateState('connected');
      options.onOpen?.();
    };

    eventSource.onerror = (event) => {
      updateState('error');
      options.onError?.(event);
      closeSource();
      scheduleReconnect();
    };

    eventSource.onmessage = (event) => {
      options.onEvent?.(parseRealtimeEvent(event.data));
    };
  };

  return {
    connect,
    disconnect: () => {
      disposed = true;
      clearReconnectTimer();
      closeSource();
      updateState('disconnected');
    },
    isConnected: () => eventSource !== null,
  };
}

export default createRealtimeChannel;
