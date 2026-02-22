interface MonitoringEventPayload {
  type: 'error' | 'unhandledrejection';
  message: string;
  stack?: string;
  path: string;
  userAgent: string;
  timestamp: string;
}

const endpoint = process.env.REACT_APP_ERROR_REPORT_ENDPOINT || '';
const environment = process.env.REACT_APP_ENVIRONMENT || process.env.NODE_ENV || 'development';

function shouldReport(): boolean {
  return Boolean(endpoint) && environment === 'production';
}

function post(payload: MonitoringEventPayload): void {
  if (!shouldReport() || typeof window === 'undefined') {
    return;
  }

  const body = JSON.stringify(payload);
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  });
}

export function initializeErrorTracking(): void {
  if (!shouldReport() || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', function (event) {
    post({
      type: 'error',
      message: event.message || 'Unhandled window error',
      stack: event.error?.stack,
      path: window.location.pathname,
      userAgent: window.navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    const message =
      typeof reason === 'string'
        ? reason
        : reason && typeof reason === 'object' && 'message' in reason
          ? String((reason as { message?: unknown }).message)
          : 'Unhandled promise rejection';

    post({
      type: 'unhandledrejection',
      message: message,
      stack: reason && typeof reason === 'object' && 'stack' in reason ? String((reason as { stack?: unknown }).stack) : undefined,
      path: window.location.pathname,
      userAgent: window.navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });
}
