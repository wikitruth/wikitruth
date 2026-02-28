export interface RealtimeEvent<TData = unknown> {
  type: string;
  timestamp: string;
  requestId?: string | null;
  data?: TData;
}

export type RealtimeConnectionState = 'connecting' | 'connected' | 'error' | 'disconnected';

export interface RealtimeChannelOptions {
  url?: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  onStateChange?: (state: RealtimeConnectionState) => void;
  onReconnectAttempt?: (attempt: number, delayMs: number) => void;
  onOpen?: () => void;
  onError?: (event: Event) => void;
  onEvent?: (event: RealtimeEvent) => void;
}

export interface RealtimeChannel {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
}
