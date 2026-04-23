describe('analytics utils', () => {
  beforeEach(() => {
    jest.resetModules();
    document.head.innerHTML = '';
    (window as unknown as { dataLayer?: unknown[] }).dataLayer = [];
  });

  it('initializes analytics and tracks page views/events', async () => {
    process.env.REACT_APP_ANALYTICS_ID = 'G-TEST123';
    const analytics = await import('./analytics');

    analytics.initAnalytics();
    analytics.trackPageView('/topics', 'Topics');
    analytics.trackEvent('signup_success', 'auth', 'signup');

    const script = document.querySelector('script[src*="googletagmanager.com/gtag/js?id=G-TEST123"]');
    expect(script).toBeTruthy();

    const dataLayer = (window as unknown as { dataLayer: unknown[] }).dataLayer;
    expect(dataLayer).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(['config', 'G-TEST123', expect.objectContaining({ send_page_view: false })]),
        expect.arrayContaining([
          'event',
          'page_view',
          expect.objectContaining({ page_path: '/topics', page_title: 'Topics' }),
        ]),
        expect.arrayContaining([
          'event',
          'signup_success',
          expect.objectContaining({ event_category: 'auth', event_label: 'signup' }),
        ]),
      ]),
    );
  });

  it('does not initialize when tracking id is absent', async () => {
    delete process.env.REACT_APP_ANALYTICS_ID;
    const analytics = await import('./analytics');

    analytics.initAnalytics();
    analytics.trackPageView('/topics');

    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
    const dataLayer = (window as unknown as { dataLayer: unknown[] }).dataLayer;
    expect(dataLayer).toEqual([]);
  });
});
