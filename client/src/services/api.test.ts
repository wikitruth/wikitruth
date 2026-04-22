import { ApiRequestError, apiService } from './api';

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

  it('parses nested API error envelope into ApiRequestError details', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Topic not found',
        },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiService.getTopicEntry('missing-topic-id')).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'Topic not found',
      status: 404,
      code: 'API_ERROR',
    } satisfies Partial<ApiRequestError>);
  });

  it('uses string error payload when server returns plain error string', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({
        error: 'Internal server error',
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiService.getTopicEntry('broken')).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'Internal server error',
      status: 500,
    } satisfies Partial<ApiRequestError>);
  });
});
