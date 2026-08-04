import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Alert from '../../../components/common/Alert';
import Button from '../../../components/common/Button';
import adminApi, { type PeopleItem } from '../../../services/api/admin';
import AdminOperationsShell from '../common/AdminOperationsShell';

type Preview = Awaited<ReturnType<typeof adminApi.previewPeopleAction>>;

function initials(item: PeopleItem): string {
  return (item.name || item.username || '?').split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function dateLabel(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'Never recorded';
}

const PeopleOperationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [verification, setVerification] = useState(searchParams.get('verification') || '');
  const [activity, setActivity] = useState(searchParams.get('activity') || '');
  const [role, setRole] = useState(searchParams.get('role') || '');
  const [risk, setRisk] = useState(searchParams.get('risk') || '');
  const [createdDays, setCreatedDays] = useState(searchParams.get('createdDays') || '');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.people>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewAction, setPreviewAction] = useState('quarantine');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await adminApi.people({
        page, limit: 25, q: searchParams.get('q') || '', state: searchParams.get('state') || '',
        verification: searchParams.get('verification') || '', activity: searchParams.get('activity') || '',
        role: searchParams.get('role') || '', risk: searchParams.get('risk') || '',
        createdDays: searchParams.get('createdDays') ? Number(searchParams.get('createdDays')) : undefined,
      });
      setData(next);
      setSelected(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load people operations');
    } finally {
      setLoading(false);
    }
  }, [page, searchParams]);

  useEffect(() => { void load(); }, [load]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    Object.entries({ q: query, state, verification, activity, role, risk, createdDays }).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    setPage(1);
    setSearchParams(next);
  };

  const clearFilters = () => {
    setQuery(''); setState(''); setVerification(''); setActivity(''); setRole(''); setRisk(''); setCreatedDays('');
    setPage(1); setSearchParams(new URLSearchParams());
  };

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const startPreview = async (action = previewAction, ids = Array.from(selected)) => {
    if (!ids.length) return;
    setRunning(true); setError(null); setMessage(null);
    try {
      setPreviewAction(action);
      setPreview(await adminApi.previewPeopleAction(ids, action));
      setReason('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not preview the account action');
    } finally { setRunning(false); }
  };

  const runAction = async () => {
    if (!preview || preview.blockerCount || (!reason.trim() && !['restore', 'revoke_sessions'].includes(preview.action))) return;
    setRunning(true); setError(null);
    try {
      const result = await adminApi.runPeopleAction(preview.previewToken, reason.trim());
      setMessage(`${result.affected} account${result.affected === 1 ? '' : 's'} updated. ${result.revokedSessions} active session${result.revokedSessions === 1 ? '' : 's'} revoked.${result.undoUntil ? ` Restore is available until ${new Date(result.undoUntil).toLocaleString()}.` : ''}`);
      setPreview(null); setSelected(new Set());
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The account action failed');
    } finally { setRunning(false); }
  };

  const allVisibleSelected = Boolean(data?.items.length) && data?.items.every((item) => selected.has(item.id));

  return (
    <AdminOperationsShell title="People" description="Review accounts, investigate spam signals, and apply reversible security actions without deleting contributions.">
      {error ? <Alert type="danger">{error}</Alert> : null}
      {message ? <Alert type="success">{message}</Alert> : null}

      <form className="wt-admin-filterbar" onSubmit={applyFilters}>
        <label>Search
          <input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, username, or email" />
        </label>
        <label>Account state
          <select className="form-control" value={state} onChange={(event) => setState(event.target.value)}><option value="">Any state</option><option value="active">Active</option><option value="needs_review">Needs review</option><option value="quarantined">Quarantined</option><option value="deactivated">Deactivated</option></select>
        </label>
        <label>Verification
          <select className="form-control" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="">Any</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
        </label>
        <label>Activity
          <select className="form-control" value={activity} onChange={(event) => setActivity(event.target.value)}><option value="">Any</option><option value="any">Has contributions</option><option value="none">No contributions</option></select>
        </label>
        <label>Role
          <select className="form-control" value={role} onChange={(event) => setRole(event.target.value)}><option value="">Any role</option><option value="admin">Admin</option><option value="reviewer">Reviewer</option><option value="screener">Screener</option><option value="account">Account</option></select>
        </label>
        <label>Created
          <select className="form-control" value={createdDays} onChange={(event) => setCreatedDays(event.target.value)}><option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select>
        </label>
        <label>Risk
          <select className="form-control" value={risk} onChange={(event) => setRisk(event.target.value)}><option value="">Any</option><option value="likely_spam">Likely spam</option></select>
        </label>
        <div className="wt-admin-page-actions" style={{ alignItems: 'flex-end' }}>
          <Button type="submit" variant="primary" icon="filter">Apply</Button>
          <Button type="button" variant="default" onClick={clearFilters}>Clear</Button>
        </div>
      </form>

      {data ? <div className="wt-admin-summary" aria-label="People summary">
        <div><small>Needs review</small><strong>{data.summary.needsReview}</strong></div>
        <div><small>Quarantined</small><strong>{data.summary.quarantined}</strong></div>
        <div><small>No activity</small><strong>{data.summary.noActivity}</strong></div>
        <div><small>Recently joined</small><strong>{data.summary.recentlyJoined}</strong></div>
      </div> : null}

      <section className="wt-admin-section">
        <header className="wt-admin-section-header"><div><h2>Accounts</h2><p>{data ? `${data.total.toLocaleString()} matching account${data.total === 1 ? '' : 's'}` : 'Measured account results'}</p></div></header>
        {selected.size ? <div className="wt-admin-selectionbar">
          <strong>{selected.size} selected</strong>
          <div className="wt-admin-selectionbar-actions">
            <select className="form-control input-sm" aria-label="Bulk action" value={previewAction} onChange={(event) => setPreviewAction(event.target.value)}>
              <option value="quarantine">Quarantine</option><option value="deactivate">Deactivate</option><option value="restore">Restore</option><option value="revoke_sessions">Revoke sessions</option>
            </select>
            <Button type="button" variant="primary" size="sm" onClick={() => void startPreview()} disabled={running}>Preview action</Button>
            <Button type="button" variant="default" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div> : null}
        <div className="wt-admin-section-body flush">
          {loading ? <div className="wt-admin-section-body text-muted"><i className="fa fa-spinner fa-spin" aria-hidden="true" /> Loading accounts…</div> : null}
          {!loading && !data?.items.length ? <div className="wt-admin-section-body text-muted">No accounts match these filters.</div> : null}
          {data?.items.length ? <table className="wt-admin-table responsive">
            <thead><tr><th><input type="checkbox" aria-label="Select all visible accounts" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(data.items.map((item) => item.id)))} /></th><th>User</th><th>Signals</th><th>Activity</th><th>Security</th><th>State</th><th>Last seen</th><th>Actions</th></tr></thead>
            <tbody>{data.items.map((item) => <tr key={item.id}>
              <td data-label="Select"><input type="checkbox" aria-label={`Select ${item.username}`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td>
              <td data-label="User"><div className="wt-admin-user"><span className="wt-admin-avatar" aria-hidden="true">{initials(item)}</span><span className="wt-admin-user-copy"><strong>{item.name || item.username}</strong><small>@{item.username} · {item.email}</small></span></div></td>
              <td data-label="Signals">{item.signals.length ? item.signals.map((signal) => <span className="wt-admin-tag" key={signal}>{signal.replace(/_/g, ' ')}</span>) : <span className="wt-admin-state healthy">No risk signal</span>}</td>
              <td data-label="Activity"><span><strong>{item.contributionCount}</strong> contribution{item.contributionCount === 1 ? '' : 's'}</span></td>
              <td data-label="Security"><span className="wt-admin-security-summary"><span title="Active sessions"><i className="fa fa-laptop" aria-hidden="true" /> {item.activeSessions}</span><span title="Active passkeys"><i className="fa fa-key" aria-hidden="true" /> {item.activePasskeys}</span><span title="Active API clients"><i className="fa fa-code" aria-hidden="true" /> {item.activeApiClients}</span></span></td>
              <td data-label="State"><span className={`wt-admin-state ${item.state === 'active' ? 'healthy' : item.state === 'needs_review' ? 'attention' : 'unavailable'}`}>{item.state.replace(/_/g, ' ')}</span></td>
              <td data-label="Last seen"><small>{dateLabel(item.lastSeen)}</small></td>
              <td data-label="Actions"><span className="wt-admin-row-actions"><Link className="btn btn-default btn-xs" to={`/admin/users/${encodeURIComponent(item.id)}`}>Review</Link><button className="btn btn-link btn-xs" type="button" onClick={() => void startPreview(item.state === 'quarantined' || item.state === 'deactivated' ? 'restore' : 'quarantine', [item.id])}>{item.state === 'quarantined' || item.state === 'deactivated' ? 'Restore' : 'Quarantine'}</button></span></td>
            </tr>)}</tbody>
          </table> : null}
        </div>
        {data && data.pages > 1 ? <footer className="wt-admin-selectionbar"><span>Page {data.page} of {data.pages}</span><div><Button type="button" size="sm" variant="default" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>{' '}<Button type="button" size="sm" variant="default" disabled={page >= data.pages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></footer> : null}
      </section>
      <p className="wt-admin-safe-note"><i className="fa fa-shield" aria-hidden="true" /> Quarantine and deactivation retain profiles and contributions. A preview, reason, privileged passkey step-up, and audit event protect every bulk action.</p>

      {preview ? <>
        <div className="wt-admin-drawer-backdrop" onClick={() => !running && setPreview(null)} aria-hidden="true" />
        <aside className="wt-admin-drawer" role="dialog" aria-modal="true" aria-labelledby="people-action-title">
          <header className="wt-admin-drawer-header"><div><h2 id="people-action-title">Preview {preview.action.replace(/_/g, ' ')}</h2><p className="text-muted">This action is explicit, audited, and does not delete contributions.</p></div><button type="button" className="close" aria-label="Close preview" onClick={() => setPreview(null)} disabled={running}>×</button></header>
          <section className="wt-admin-preview-block"><h3>Affected accounts ({preview.targets.length})</h3>{preview.targets.map((target) => <div className="wt-admin-preview-target" key={target.id}><span><strong>{target.username}</strong><small className="text-muted" style={{ display: 'block' }}>{target.email}</small></span><span>{target.activeSessions} session{target.activeSessions === 1 ? '' : 's'}</span>{target.blockers.map((blocker) => <div className="text-danger" key={blocker} style={{ gridColumn: '1 / -1' }}>{blocker}</div>)}</div>)}</section>
          <section className="wt-admin-preview-block"><h3>Content retained</h3><p>{preview.targets.reduce((total, target) => total + target.retainedContributions, 0)} contribution records remain attached to these accounts.</p></section>
          <section className="wt-admin-preview-block"><h3>Blockers</h3>{preview.blockerCount ? <p className="text-danger">Resolve the blockers above before continuing.</p> : <p className="wt-admin-state healthy"><i className="fa fa-check-circle" aria-hidden="true" /> No blockers</p>}</section>
          {!['restore', 'revoke_sessions'].includes(preview.action) ? <div className="form-group"><label htmlFor="people-action-reason">Reason (required)</label><textarea id="people-action-reason" className="form-control" rows={4} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why these accounts require this action" /></div> : null}
          <p className="wt-admin-safe-note"><i className="fa fa-info-circle" aria-hidden="true" /> Active sessions will be revoked where the selected action requires it. Nothing is permanently deleted.</p>
          <footer className="wt-admin-drawer-footer"><Button type="button" variant="default" onClick={() => setPreview(null)} disabled={running}>Cancel</Button><Button type="button" variant={preview.action === 'restore' ? 'success' : 'primary'} onClick={() => void runAction()} disabled={running || Boolean(preview.blockerCount) || (!reason.trim() && !['restore', 'revoke_sessions'].includes(preview.action))}>{running ? 'Applying…' : `Confirm ${preview.action.replace(/_/g, ' ')}`}</Button></footer>
        </aside>
      </> : null}
    </AdminOperationsShell>
  );
};

export default PeopleOperationsPage;
