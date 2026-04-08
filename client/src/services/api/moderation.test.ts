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

    await moderationApi.migrateOwnershipScope('topic-1', 'diary', 'alice');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/moderation/ownership-migration',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-csrf-token' }),
        body: JSON.stringify({
          topicId: 'topic-1',
          targetScope: 'diary',
          username: 'alice',
        }),
      }),
    );
  });
});
