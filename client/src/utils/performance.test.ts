import { startPerformanceMonitoring } from './performance';

type MutableObserverHost = { PerformanceObserver: typeof PerformanceObserver | undefined };

describe('performance monitoring', () => {
  const originalObserver = globalThis.PerformanceObserver;

  afterEach(() => {
    (globalThis as MutableObserverHost).PerformanceObserver = originalObserver;
    jest.restoreAllMocks();
  });

  it('does not throw when observer is unavailable', () => {
    (globalThis as MutableObserverHost).PerformanceObserver = undefined;
    expect(() => startPerformanceMonitoring()).not.toThrow();
  });

  it('subscribes to navigation entries when observer exists', () => {
    const observe = jest.fn();
    (globalThis as MutableObserverHost).PerformanceObserver =
      jest.fn(() => ({ observe })) as unknown as typeof PerformanceObserver;

    expect(() => startPerformanceMonitoring()).not.toThrow();
    expect(observe).toHaveBeenCalledWith({ type: 'navigation', buffered: true });
  });
});
