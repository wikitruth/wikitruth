import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import adminApi, {
  type AdminGroupAccessSnapshot,
  type AdminPermission,
  type DirectPermissionState,
} from '../../../services/api/admin';
import PermissionMatrix from '../Access/PermissionMatrix';
import AdminOperationsShell from '../common/AdminOperationsShell';

function statesFrom(snapshot: AdminGroupAccessSnapshot): Record<string, DirectPermissionState> {
  return Object.fromEntries(snapshot.catalog.map((row) => [row.name, row.granted ? 'allow' : 'inherit']));
}

const GroupDetails: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [access, setAccess] = useState<AdminGroupAccessSnapshot | null>(null);
  const [name, setName] = useState('');
  const [states, setStates] = useState<Record<string, DirectPermissionState>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const snapshot = await adminApi.adminGroupAccess(id);
      setAccess(snapshot); setName(snapshot.group.name); setStates(statesFrom(snapshot));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load administrator group.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);
  const dirty = useMemo(() => access ? name !== access.group.name
    || JSON.stringify(states) !== JSON.stringify(statesFrom(access)) : false, [access, name, states]);

  const save = async () => {
    if (!access) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const permissions = Object.entries(states).flatMap(([permission, state]) => state === 'allow'
        ? [{ name: permission as AdminPermission, permit: true }] : []);
      const snapshot = await adminApi.updateAdminGroupAccess(id, { name: name.trim(), permissions });
      setAccess(snapshot); setName(snapshot.group.name); setStates(statesFrom(snapshot));
      setMessage('Group access saved and recorded in the privileged audit trail.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save administrator group.');
    } finally { setBusy(false); }
  };

  return (
    <AdminOperationsShell title="Admin Group Details" description="Reusable permission grants and affected administrators."
      actions={<Link className="btn btn-default" to="/admin/groups">Back to groups</Link>}>
      {loading ? <div className="wt-admin-section"><div className="wt-admin-section-body">Loading group access…</div></div> : null}
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {message ? <div className="alert alert-success" role="status">{message}</div> : null}
      {access ? <>
        <section className="wt-admin-section">
          <div className="wt-admin-section-header"><div><h2>Group identity and impact</h2><p>Group ID: <code>{access.group.id}</code></p></div></div>
          <div className="wt-admin-section-body wt-admin-group-identity">
            <label htmlFor="admin-group-name">Group name</label>
            <input id="admin-group-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} />
            <div><strong>{access.administrators.length}</strong><span>assigned administrators</span></div>
          </div>
          {access.administrators.length ? <div className="wt-admin-assigned-admins">
            {access.administrators.map((admin) => <Link key={admin.id} to={`/admin/administrators/${admin.id}`}>
              {String(admin.user?.name || admin.id)}
            </Link>)}
          </div> : null}
        </section>
        <PermissionMatrix groupMode rows={access.catalog} states={states}
          onChange={(permission, state) => setStates((current) => ({ ...current, [permission]: state }))} disabled={busy} />
        <div className="wt-admin-sticky-actions">
          <span>{dirty ? 'Unsaved group changes' : 'Group access is up to date'}</span>
          <div><button className="btn btn-default" type="button" disabled={busy || !dirty}
            onClick={() => { setName(access.group.name); setStates(statesFrom(access)); }}>Discard</button>
            <button className="btn btn-primary" type="button" disabled={busy || !dirty || !name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save group'}</button></div>
        </div>
      </> : null}
    </AdminOperationsShell>
  );
};

export default GroupDetails;
