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

  it('passes legacy topic-link context query when loading topic entry', async () => {
    await apiService.getTopicEntry('topic-link-id', { topicLink: 'topic-link-id', mode: 'edit-link', id: 'topic-link-id' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/topics/entry/topic-link-id?topicLink=topic-link-id&mode=edit-link&id=topic-link-id',
      expect.any(Object)
    );
  });

  it('passes legacy argument-link context query when loading argument entry', async () => {
    await apiService.getArgumentEntry('argument-link-id', {
      argumentLink: 'argument-link-id',
      mode: 'edit-link',
      id: 'argument-link-id',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/arguments/entry/argument-link-id?argumentLink=argument-link-id&mode=edit-link&id=argument-link-id',
      expect.any(Object)
    );
  });

  it('loads expandable children without reusing a stale detail response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ arguments: [{ _id: 'child-1', title: 'Child fact' }] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiService.getEntryChildren('argument', 'parent-1');

    expect(result.arguments).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/arguments/entry/parent-1',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('calls dedicated topic-link mutation endpoints', async () => {
    await apiService.updateTopicLink('topic-link-1', { title: 'Renamed link' });
    await apiService.deleteTopicLink('topic-link-1');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/topics/links/topic-link-1',
      expect.objectContaining({
        method: 'PUT',
      })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/topics/links/topic-link-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('calls dedicated argument-link mutation endpoints', async () => {
    await apiService.updateArgumentLink('argument-link-1', { title: 'Context title', supportsParent: true });
    await apiService.deleteArgumentLink('argument-link-1');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/arguments/links/argument-link-1',
      expect.objectContaining({
        method: 'PUT',
      })
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/arguments/links/argument-link-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('sends artifact files as multipart form data without a JSON content type', async () => {
    const file = new File(['artifact'], 'evidence.txt', { type: 'text/plain' });

    await apiService.createArtifact({
      title: 'Evidence artifact',
      description: 'Detailed artifact description',
      private: false,
      tags: '20,30',
      file,
    });

    const request = (globalThis.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(request.body).toBeInstanceOf(FormData);
    const uploaded = (request.body as FormData).get('inlineFile') as File;
    expect(uploaded.name).toBe('evidence.txt');
    expect(uploaded.size).toBe(8);
    expect((request.body as FormData).get('tags')).toBe('20,30');
    expect(request.headers).not.toHaveProperty('Content-Type');
  });
});
