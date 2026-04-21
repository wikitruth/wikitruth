import moderationApi from './moderation';

describe('moderationApi', () => {
  beforeEach(() => {
    document.cookie = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads moderation entry metadata by target query', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, entry: {} }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await moderationApi.entry({ key: 'topic', id: 't1' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/moderation/entry?topic=t1',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('sends csrf token on moderation mutations', async () => {
    document.cookie = '_csrfToken=test-csrf-token';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await moderationApi.updateScreening({ key: 'topic', id: 't1' }, 1);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/moderation/screening?topic=t1',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-csrf-token' }),
      }),
    );
  });

  it('posts ownership migration payload for admin migration flow', async () => {
    document.cookie = '_csrfToken=test-csrf-token';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await moderationApi.migrateOwnershipScope('topic-1', 'journal', 'alice');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/moderation/ownership-migration',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-csrf-token' }),
        body: JSON.stringify({
          topicId: 'topic-1',
          targetScope: 'journal',
          username: 'alice',
        }),
      }),
    );
  });

  it('loads verdict queue with filter query params', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, entries: [] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await moderationApi.listVerdicts({
      objectType: 1,
      status: 0,
      q: 'climate',
      page: 2,
      limit: 25,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/moderation/verdicts?objectType=1&status=0&page=2&limit=25&q=climate',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('posts bulk verdict updates with csrf token', async () => {
    document.cookie = '_csrfToken=test-csrf-token';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, results: [] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await moderationApi.bulkUpdateVerdicts([
      { id: 'topic-1', type: 1, status: 1, reasoning: '<p>Verified</p>' },
      { id: 'arg-1', type: 2, status: 2 },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/moderation/verdicts/bulk',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-csrf-token' }),
        body: JSON.stringify({
          updates: [
            { id: 'topic-1', type: 1, status: 1, reasoning: '<p>Verified</p>' },
            { id: 'arg-1', type: 2, status: 2 },
          ],
        }),
      }),
    );
  });
});
