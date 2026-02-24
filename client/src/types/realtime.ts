export interface RealtimeEvent<TData = unknown> {
  type: string;
  timestamp: string;
  requestId?: string | null;
  data?: TData;
}

export interface RealtimeChannelOptions {
  url?: string;
  onOpen?: () => void;
  onError?: (event: Event) => void;
  onEvent?: (event: RealtimeEvent) => void;
}

export interface RealtimeChannel {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
}
