import type { RealtimeDurableAdapter } from '../../server/src/services/realtimeAdapter';
import {
  getRealtimeAdapterName,
  publishRealtimeEvent,
  setRealtimeDurableAdapterForTests,
  subscribeRealtime,
} from '../../server/src/services/realtimeEvents';

describe('realtime durable adapter bridge', () => {
  afterEach(() => setRealtimeDurableAdapterForTests(null));

  it('fans local events out immediately and persists them through the configured adapter', async () => {
    let receiveRemote: ((event: { type: string }) => void) | undefined;
    const publish = jest.fn(async () => undefined);
    const adapter: RealtimeDurableAdapter = {
      name: 'test-durable',
      publish,
      subscribe(subscriber) {
        receiveRemote = subscriber;
        return () => { receiveRemote = undefined; };
      },
    };
    setRealtimeDurableAdapterForTests(adapter);
    const received: string[] = [];
    const unsubscribe = subscribeRealtime((event) => received.push(event.type));

    publishRealtimeEvent({ type: 'local.event' });
    await Promise.resolve();
    receiveRemote?.({ type: 'remote.event' });

    expect(received).toEqual(['local.event', 'remote.event']);
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'local.event', timestamp: expect.any(String) }));
    expect(getRealtimeAdapterName()).toBe('test-durable');
    unsubscribe();
  });
});
