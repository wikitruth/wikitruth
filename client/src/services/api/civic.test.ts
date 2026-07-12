import civicApi from './civic';

describe('civicApi', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.restoreAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    document.cookie = '_csrfToken=; Max-Age=0; path=/';
  });

  it('loads filtered civic records', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ records: [], count: 0 }),
    } as Response);

    await civicApi.list({ kind: 'incident,observation', status: 'active', region: 'NCR' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/civic/records?kind=incident%2Cobservation&status=active&region=NCR',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('sends CSRF protection with civic mutations', async () => {
    document.cookie = '_csrfToken=civic-token; path=/';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ record: { _id: 'record-1' } }),
    } as Response);

    await civicApi.create({ kind: 'incident', title: 'A documented incident' });

    expect(fetchMock).toHaveBeenCalledWith('/api/civic/records', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'x-csrf-token': 'civic-token' }),
    }));
  });

  it('surfaces structured API errors', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Parent civic record was not found' } }),
    } as Response);

    await expect(civicApi.create({ kind: 'office', title: 'Regional office', parentId: 'missing' }))
      .rejects.toThrow('Parent civic record was not found');
  });
});
