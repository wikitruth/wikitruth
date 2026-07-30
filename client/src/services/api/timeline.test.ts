import timelineApi from './timeline';

describe('timelineApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('serializes entry identity, paging, and event filters', async () => {
    await timelineApi.list({
      objectName: 'topic & fact',
      objectType: 2,
      id: 'entry/1',
      page: 3,
      limit: 40,
      eventTypes: ['entry.updated', 'verdict decided'],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/timeline?objectName=topic+%26+fact&id=entry%2F1&objectType=2&page=3&limit=40&eventTypes=entry.updated%2Cverdict+decided',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('requests bounded visualization data', async () => {
    await timelineApi.visualization({ objectName: 'question', objectType: 3, id: 'q-1', days: 90 });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/timeline/visualization?objectName=question&id=q-1&objectType=3&days=90',
      expect.any(Object),
    );
  });

  it('requests paged revisions without adding absent optional values', async () => {
    await timelineApi.revisions({ objectName: 'artifact', id: 'artifact-1', page: 1, limit: 10 });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/timeline/revisions?objectName=artifact&id=artifact-1&page=1&limit=10',
      expect.any(Object),
    );
  });

  it('uses a server error message and falls back to the response status', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Timeline access denied' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => { throw new Error('not json'); },
      });

    await expect(timelineApi.list({ objectName: 'topic', id: 't-1' }))
      .rejects.toThrow('Timeline access denied');
    await expect(timelineApi.visualization({ objectName: 'topic', id: 't-1' }))
      .rejects.toThrow('Timeline request failed: 503');
  });
});
