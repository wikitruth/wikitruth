import { startPerformanceMonitoring } from './performance';

describe('performance monitoring', () => {
  const originalObserver = globalThis.PerformanceObserver;

  afterEach(() => {
    globalThis.PerformanceObserver = originalObserver;
    jest.restoreAllMocks();
  });

  it('does not throw when observer is unavailable', () => {
    // @ts-expect-error test override
    globalThis.PerformanceObserver = undefined;
    expect(() => startPerformanceMonitoring()).not.toThrow();
  });

  it('subscribes to navigation entries when observer exists', () => {
    const observe = jest.fn();
    // @ts-expect-error test override
    globalThis.PerformanceObserver = jest.fn(() => ({ observe }));

    expect(() => startPerformanceMonitoring()).not.toThrow();
    expect(observe).toHaveBeenCalledWith({ type: 'navigation', buffered: true });
  });
});
