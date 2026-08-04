import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import adminApi, {
  type AdminAccessSnapshot,
  type AdminPermission,
  type AdminRecord,
  type DirectPermissionState,
} from '../../../services/api/admin';
import PermissionMatrix from '../Access/PermissionMatrix';
import AdminOperationsShell from '../common/AdminOperationsShell';

function statesFrom(snapshot: AdminAccessSnapshot): Record<string, DirectPermissionState> {
  return Object.fromEntries(snapshot.catalog.map((row) => [row.name, row.direct]));
}

function displayName(record: AdminRecord): string {
  return String(record.username || record.email || record.name || record._id || 'Unknown user');
}

const AdminDetails: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [access, setAccess] = useState<AdminAccessSnapshot | null>(null);
  const [states, setStates] = useState<Record<string, DirectPermissionState>>({});
  const [groups, setGroups] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await adminApi.administratorAccess(id);
      setAccess(snapshot);
      setStates(statesFrom(snapshot));
      setGroups(snapshot.groups.filter((group) => group.assigned).map((group) => group.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load administrator access.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);

  const dirty = useMemo(() => access ? (
    JSON.stringify(states) !== JSON.stringify(statesFrom(access))
      || JSON.stringify([...groups].sort()) !== JSON.stringify(access.groups.filter((group) => group.assigned).map((group) => group.id).sort())
  ) : false, [access, groups, states]);

  const save = async () => {
    if (!access || access.administrator.selfProtected) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const permissions = Object.entries(states).flatMap(([name, state]) => state === 'inherit' ? [] : [{
        name: name as AdminPermission,
        permit: state === 'allow',
      }]);
      const snapshot = await adminApi.updateAdministratorAccess(id, { permissions, groups });
      setAccess(snapshot); setStates(statesFrom(snapshot));
      setGroups(snapshot.groups.filter((group) => group.assigned).map((group) => group.id));
      setMessage('Administrator access saved and recorded in the privileged audit trail.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save administrator access.');
    } finally { setBusy(false); }
  };

  const searchUsers = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError(null);
    try {
      const response = await adminApi.users({ query: query.trim(), limit: 10 });
      setUsers(response.items);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'User search failed.');
    } finally { setBusy(false); }
  };

  const linkUser = async () => {
    if (!selectedUser) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      await adminApi.linkAdministratorUser(id, selectedUser);
      await load();
      setMessage('The user is now linked to this administrator record.');
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Unable to link the user.');
    } finally { setBusy(false); }
  };

  const unlinkUser = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      await adminApi.unlinkAdministratorUser(id);
      await load();
      setMessage('The linked user was removed.');
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : 'Unable to unlink the user.');
    } finally { setBusy(false); }
  };

  return (
    <AdminOperationsShell
      title="Administrator Details"
      description="Permissions, groups, and linked user with effective-access preview."
      actions={<Link className="btn btn-default" to="/admin/administrators">Back to administrators</Link>}
    >
      {loading ? <div className="wt-admin-section"><div className="wt-admin-section-body">Loading administrator access…</div></div> : null}
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {message ? <div className="alert alert-success" role="status">{message}</div> : null}
      {access ? (
        <>
          <section className="wt-admin-section">
            <div className="wt-admin-section-header"><div><h2>Access summary</h2><p>Changes require passkey confirmation and are audited.</p></div></div>
            <div className="wt-admin-section-body wt-admin-access-summary">
              <dl className="wt-admin-detail-list">
                <div className="wt-admin-detail-row"><dt>Administrator</dt><dd>{String(access.administrator.user.name || access.administrator.id)}</dd></div>
                <div className="wt-admin-detail-row"><dt>Linked user</dt><dd>{String(access.administrator.user.name || 'Not linked')}</dd></div>
                <div className="wt-admin-detail-row"><dt>Effective permissions</dt><dd>{access.catalog.filter((row) => row.effective).length} of {access.catalog.length}</dd></div>
              </dl>
              {access.administrator.legacySuperAdmin ? <div className="wt-admin-warning"><strong>Legacy full access.</strong> No recognized assignment exists, so compatibility currently grants every permission. Saving explicit access removes this fallback.</div> : null}
              {access.administrator.selfProtected ? <div className="wt-admin-warning"><strong>Your own access is protected.</strong> Ask another security administrator to make access changes.</div> : null}
            </div>
          </section>

          <section className="wt-admin-section">
            <div className="wt-admin-section-header"><div><h2>Group assignments</h2><p>Preview inherited permissions in the matrix before saving.</p></div></div>
            <div className="wt-admin-section-body wt-admin-group-choices">
              {access.groups.length ? access.groups.map((group) => (
                <label key={group.id}>
                  <input type="checkbox" checked={groups.includes(group.id)} disabled={busy || access.administrator.selfProtected}
                    onChange={(event) => setGroups((current) => event.target.checked ? [...current, group.id] : current.filter((idValue) => idValue !== group.id))} />
                  <span><strong>{group.name}</strong><small>{group.permissions.filter((row) => row.permit).length} grants</small></span>
                </label>
              )) : <p>No administrator groups are configured.</p>}
            </div>
          </section>

          <PermissionMatrix rows={access.catalog} states={states}
            onChange={(name, state) => setStates((current) => ({ ...current, [name]: state }))}
            disabled={busy || access.administrator.selfProtected} />

          <section className="wt-admin-section">
            <div className="wt-admin-section-header"><div><h2>Linked user</h2><p>Search by username or email; raw database IDs are not required.</p></div></div>
            <div className="wt-admin-section-body">
              <form className="wt-admin-user-search" onSubmit={searchUsers}>
                <label htmlFor="admin-user-search">Find a user</label>
                <div><input id="admin-user-search" className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Username or email" />
                  <button className="btn btn-default" type="submit" disabled={busy || !query.trim()}>Search</button></div>
              </form>
              {users.length ? <div className="wt-admin-user-results">{users.map((user) => {
                const userId = String(user._id || user.id || '');
                return <label key={userId}><input type="radio" name="linked-user" value={userId} checked={selectedUser === userId} onChange={() => setSelectedUser(userId)} /> <span>{displayName(user)}</span></label>;
              })}</div> : null}
              <div className="wt-admin-button-row">
                <button className="btn btn-primary" type="button" disabled={busy || !selectedUser} onClick={linkUser}>Link selected user</button>
                <button className="btn btn-default" type="button" disabled={busy || !access.administrator.user.id || access.administrator.selfProtected} onClick={unlinkUser}>Unlink current user</button>
              </div>
            </div>
          </section>

          <div className="wt-admin-sticky-actions">
            <span>{dirty ? 'Unsaved access changes' : 'Access is up to date'}</span>
            <div>
              <button className="btn btn-default" type="button" disabled={busy || !dirty} onClick={() => { setStates(statesFrom(access)); setGroups(access.groups.filter((group) => group.assigned).map((group) => group.id)); }}>Discard</button>
              <button className="btn btn-primary" type="button" disabled={busy || !dirty || access.administrator.selfProtected} onClick={save}>{busy ? 'Saving…' : 'Save access'}</button>
            </div>
          </div>
        </>
      ) : null}
    </AdminOperationsShell>
  );
};

export default AdminDetails;
