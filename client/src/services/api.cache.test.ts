import apiService from './api';

describe('apiService cache behavior', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('caches GET responses by endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ topics: [] }),
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await apiService.getTopics();
    await apiService.getTopics();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
