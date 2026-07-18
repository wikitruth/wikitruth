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

  it('loads tenant configuration and jurisdiction filters', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ tenant: { tenantId: 'fix-example' } }) } as Response);
    await civicApi.tenant();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/civic/tenant', expect.objectContaining({ credentials: 'include' }));

    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ jurisdictions: [], count: 0 }) } as Response);
    await civicApi.jurisdictions({ levelKey: 'district' });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/civic/jurisdictions?levelKey=district', expect.objectContaining({ credentials: 'include' }));
  });

  it('loads tenant-scoped actor roles instead of inferring global roles', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ authenticated: true, tenantId: 'fix-example', userId: 'user-1', roles: ['reviewer'] }) } as Response);
    await civicApi.actor();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/civic/me', expect.objectContaining({ credentials: 'include' }));
  });

  it('manages tenant memberships and jurisdictions with CSRF protection', async () => {
    document.cookie = '_csrfToken=admin-token; path=/';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ membership: { userId: 'user-1' } }) } as Response);
    await civicApi.updateMembership('user-1', { roles: ['contributor'], active: true });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/civic/admin/memberships/user-1', expect.objectContaining({
      method: 'PUT', headers: expect.objectContaining({ 'x-csrf-token': 'admin-token' }),
    }));

    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ jurisdiction: { _id: 'j1' } }) } as Response);
    await civicApi.createJurisdiction({ code: 'NCR', levelKey: 'region', name: 'National Capital Region' });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/civic/admin/jurisdictions', expect.objectContaining({ method: 'POST' }));
  });

  it('explicitly provisions tenant authority through the platform route', async () => {
    document.cookie = '_csrfToken=platform-token; path=/';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ membership: { userId: 'user-1', roles: ['admin'] } }) } as Response);
    await civicApi.provisionTenantMembership('fix-example', 'user-1', { roles: ['admin'], active: true });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/civic/platform/tenants/fix-example/memberships/user-1', expect.objectContaining({
      method: 'PUT', headers: expect.objectContaining({ 'x-csrf-token': 'platform-token' }),
    }));
  });

  it('creates a typed Wikitruth knowledge link with CSRF protection', async () => {
    document.cookie = '_csrfToken=link-token; path=/';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ link: { _id: 'link-1' } }) } as Response);
    await civicApi.addLink('record-1', { relationship: 'evidence', objectId: '66f000000000000000000001' });
    expect(fetchMock).toHaveBeenCalledWith('/api/civic/records/record-1/links', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'x-csrf-token': 'link-token' }),
    }));
  });
});
