const report = (message: string, value: number) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info(`[perf] ${message}: ${value.toFixed(2)}ms`);
  }
};

export const startPerformanceMonitoring = () => {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          report('navigation', entry.duration);
        }
      });
    });

    observer.observe({ type: 'navigation', buffered: true });
  } catch {
    // no-op on unsupported browsers
  }
};
