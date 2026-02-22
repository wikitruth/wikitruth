describe('monitoring', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports runtime errors to monitoring endpoint in production', async () => {
    process.env.REACT_APP_ERROR_REPORT_ENDPOINT = '/api/monitoring/errors';
    process.env.REACT_APP_ENVIRONMENT = 'production';

    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeacon,
    });

    const { initializeErrorTracking } = await import('./monitoring');
    initializeErrorTracking();

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'boom',
        error: new Error('boom'),
      })
    );

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/monitoring/errors');
  });
});
