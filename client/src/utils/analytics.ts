type EventParams = Record<string, string | number | boolean | undefined>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = typeof window !== 'undefined' ? (window as any) : undefined;

let initialized = false;
const trackingId = typeof process !== 'undefined' ? process.env.REACT_APP_ANALYTICS_ID : undefined;

function gtag(...args: unknown[]): void {
  if (win?.dataLayer) {
    (win.dataLayer as unknown[]).push(args);
  }
}

export function initAnalytics(): void {
  if (initialized || !trackingId || !win) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trackingId)}`;
  document.head.appendChild(script);

  win.dataLayer = win.dataLayer || [];
  gtag('js', new Date());
  gtag('config', trackingId, { send_page_view: false });

  initialized = true;
}

export function trackPageView(path: string, title?: string): void {
  if (!initialized) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
}

export function trackEvent(
  action: string,
  category?: string,
  label?: string,
  value?: number,
  params?: EventParams,
): void {
  if (!initialized) return;
  gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
    ...params,
  });
}
