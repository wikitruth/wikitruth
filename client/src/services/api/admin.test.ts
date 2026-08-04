import adminApi from './admin';

describe('adminApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.cookie = '_csrfToken=; Max-Age=0; path=/';
  });

  it('loads dashboard counts', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.dashboard();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('loads users list', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, items: [] }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.users({ page: 3, limit: 50, query: 'ada lovelace' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users?page=3&limit=50&q=ada+lovelace',
      expect.any(Object)
    );
  });

  it('loads one user directly instead of scanning a collection page', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, item: { _id: 'user/1', username: 'ada' } }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(adminApi.user('user/1')).resolves.toEqual({ _id: 'user/1', username: 'ada' });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/user%2F1', expect.any(Object));
  });

  it('rejects failed admin responses with the server message', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ success: false, message: 'Admin storage is unavailable' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(adminApi.accounts()).rejects.toThrow('Admin storage is unavailable');
  });

  it('sends csrf token for mutation requests', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.deleteStatus('active');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/statuses/active',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
      })
    );
  });

  it('creates users through admin endpoint', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, user: { _id: 'u1' } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.createUser({
      username: 'demo',
      email: 'demo@example.com',
      password: 'secret12',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
      })
    );
  });

  it('updates administrator groups via dedicated endpoint', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true, admin: { _id: 'a1' } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.updateAdministratorGroups('a1', ['ops', 'moderators']);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/administrators/a1/groups',
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('loads and atomically updates the effective administrator access model', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const access = { administrator: { id: 'a/1' }, catalog: [], groups: [] };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, access }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(adminApi.administratorAccess('a/1')).resolves.toEqual(access);
    await adminApi.updateAdministratorAccess('a/1', {
      permissions: [{ name: 'users.manage', permit: true }],
      groups: ['operators'],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/administrators/a%2F1/access', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/administrators/a%2F1/access', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ permissions: [{ name: 'users.manage', permit: true }], groups: ['operators'] }),
      headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
    }));
  });

  it('deletes accounts and administrators via dedicated endpoints', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.deleteAccount('acc-1');
    await adminApi.deleteAdministrator('adm-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/accounts/acc-1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/administrators/adm-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('previews people actions before applying them', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, previewToken: 'signed-preview', targets: [] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.previewPeopleAction(['user/1'], 'quarantine');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/people/actions/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['user/1'], action: 'quarantine' }),
        headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
      })
    );
  });

  it('previews and confirms a snapshot restore through separate guarded calls', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const snapshotId = 'snapshot/2026-08-04';

    await adminApi.previewDbRestore(snapshotId, { restorePublicData: true, restorePrivateData: false });
    await adminApi.runDbRestore({ snapshotId, previewToken: 'signed-token', confirmText: `RESTORE ${snapshotId}` });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/db-backup/snapshots/snapshot%2F2026-08-04/preview',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ restorePublicData: true, restorePrivateData: false }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/db-backup',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'restore', snapshotId, previewToken: 'signed-token', confirmText: `RESTORE ${snapshotId}` }) })
    );
  });

  it('loads telemetry and applies audited alert actions', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, telemetry: { events: [], history: [], rules: [], alerts: [] }, alert: { _id: 'alert/1' } }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await adminApi.operationalTelemetry();
    await adminApi.updateOperationalAlert('alert/1', 'acknowledge', 'Investigating');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/operational-telemetry', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/operational-telemetry/alerts/alert%2F1/actions', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ action: 'acknowledge', acknowledgement: 'Investigating' }),
      headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
    }));
  });

  it('previews and executes privacy requests through guarded admin endpoints', async () => {
    document.cookie = '_csrfToken=test-admin-csrf';
    const preview = { previewToken: 'preview-token', confirmationPhrase: 'ANONYMIZE ada' };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, preview }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, request: { id: 'privacy/1', status: 'completed' } }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(adminApi.previewPrivacyAnonymization('privacy/1')).resolves.toEqual(preview);
    await adminApi.runPrivacyRequestAction('privacy/1', {
      action: 'execute', previewToken: 'preview-token', confirmation: 'ANONYMIZE ada',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/privacy-requests/privacy%2F1/preview', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/privacy-requests/privacy%2F1/actions', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'x-csrf-token': 'test-admin-csrf' }),
    }));
  });
});
