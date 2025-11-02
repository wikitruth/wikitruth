import { apiService } from './api';

describe('apiService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses /api base path by default', async () => {
    await apiService.getHomeData();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/home',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('adds topic query string for scoped topic fetch', async () => {
    await apiService.getTopics('abc123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/topics?topic=abc123',
      expect.any(Object)
    );
  });
});
