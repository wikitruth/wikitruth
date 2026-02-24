import { createRealtimeChannel } from './channel';

class MockEventSource {
  static instances: MockEventSource[] = [];

  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readonly url: string;
  public readonly withCredentials: boolean;
  public readonly close = jest.fn();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = Boolean(init?.withCredentials);
    MockEventSource.instances.push(this);
  }

  emitOpen(): void {
    this.onopen?.(new Event('open'));
  }

  emitMessage(payload: unknown): void {
    this.onmessage?.({ data: payload } as MessageEvent);
  }

  emitError(): void {
    this.onerror?.(new Event('error'));
  }
}

describe('realtime channel service', () => {
  const originalEventSource = window.EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    Object.defineProperty(window, 'EventSource', {
      value: MockEventSource,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'EventSource', {
      value: originalEventSource,
      writable: true,
      configurable: true,
    });
  });

  it('connects and emits parsed realtime events', () => {
    const onOpen = jest.fn();
    const onEvent = jest.fn();
    const onError = jest.fn();

    const channel = createRealtimeChannel({
      url: '/api/realtime/events',
      onOpen,
      onEvent,
      onError,
    });

    channel.connect();

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toBe('/api/realtime/events');
    expect(MockEventSource.instances[0]?.withCredentials).toBe(true);
    expect(channel.isConnected()).toBe(true);

    MockEventSource.instances[0]?.emitOpen();
    MockEventSource.instances[0]?.emitMessage(
      JSON.stringify({ type: 'heartbeat', timestamp: '2026-02-24T00:00:00.000Z' })
    );
    MockEventSource.instances[0]?.emitError();

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'heartbeat', timestamp: '2026-02-24T00:00:00.000Z' })
    );
    expect(onError).toHaveBeenCalledTimes(1);

    channel.disconnect();

    expect(MockEventSource.instances[0]?.close).toHaveBeenCalledTimes(1);
    expect(channel.isConnected()).toBe(false);
  });

  it('no-ops when EventSource is unavailable', () => {
    Object.defineProperty(window, 'EventSource', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const channel = createRealtimeChannel();

    channel.connect();

    expect(channel.isConnected()).toBe(false);
  });
});
