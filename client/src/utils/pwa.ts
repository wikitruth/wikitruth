export const registerPwa = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const environment = process.env.REACT_APP_ENVIRONMENT || process.env.NODE_ENV || 'development';
  if (environment !== 'production') {
    return;
  }

  try {
    await navigator.serviceWorker.register('/service-worker.js');
  } catch {
    // Keep startup resilient if service worker registration fails.
  }
};
