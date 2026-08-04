import React, { useCallback, useEffect, useMemo, useState } from 'react';
import adminApi, {
  type AnonymizationPreview,
  type PrivacyRequest,
  type PrivacyRequestStatus,
} from '../../../services/api/admin';
import AdminOperationsShell from '../common/AdminOperationsShell';
import '../../Account/privacyOperations.css';

const statusOptions: Array<PrivacyRequestStatus | 'all'> = [
  'all', 'submitted', 'in_review', 'approved', 'ready', 'processing', 'blocked', 'failed', 'completed', 'rejected', 'cancelled',
];

function dateTime(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function subjectName(request: PrivacyRequest): string {
  return request.subject?.username || request.execution.pseudonym || request.subjectUserId;
}

const PrivacyRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [selected, setSelected] = useState<PrivacyRequest | null>(null);
  const [preview, setPreview] = useState<AnonymizationPreview | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PrivacyRequestStatus | 'all'>('all');
  const [type, setType] = useState<'all' | 'export' | 'anonymization'>('all');
  const [note, setNote] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await adminApi.privacyRequests();
      setRequests(result);
      setSelected((current) => current ? result.find((request) => request.id === current.id) || null : null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load privacy requests.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => (status === 'all' || request.status === status)
      && (type === 'all' || request.type === type)
      && (!needle || [request.reference, subjectName(request), request.subject?.email, request.reason]
        .some((value) => String(value || '').toLowerCase().includes(needle))));
  }, [query, requests, status, type]);

  const runAction = async (action: 'review' | 'approve' | 'reject' | 'hold' | 'clear_hold' | 'execute') => {
    if (!selected) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const updated = await adminApi.runPrivacyRequestAction(selected.id, {
        action, note: note.trim(),
        ...(action === 'execute' && preview ? { previewToken: preview.previewToken, confirmation } : {}),
      });
      setSelected(updated); setNote(''); setConfirmation('');
      if (action === 'execute') setPreview(null);
      setMessage(`Privacy request ${action.replace('_', ' ')} completed.`); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Privacy request action failed.'); }
    finally { setBusy(false); }
  };

  const runPreview = async () => {
    if (!selected) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await adminApi.previewPrivacyAnonymization(selected.id);
      setPreview(result); setSelected(result.request); setConfirmation('');
    } catch (previewError) { setError(previewError instanceof Error ? previewError.message : 'Anonymization preview failed.'); }
    finally { setBusy(false); }
  };

  const counts = requests.reduce<Record<string, number>>((result, request) => {
    result[request.status] = (result[request.status] || 0) + 1; return result;
  }, {});

  return <AdminOperationsShell title="Privacy requests" description="Govern account exports and anonymization with review, legal hold, approval, preview, and audited execution.">
    {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
    {message ? <div className="alert alert-success" role="status">{message}</div> : null}
    <section className="wt-admin-summary" aria-label="Privacy request summary">
      <div><small>Submitted</small><strong>{counts.submitted || 0}</strong></div>
      <div><small>In review</small><strong>{counts.in_review || 0}</strong></div>
      <div><small>Blocked</small><strong>{counts.blocked || 0}</strong></div>
      <div><small>Ready</small><strong>{counts.ready || 0}</strong></div>
    </section>
    <div className="wt-admin-filterbar wt-privacy-filters">
      <label>Search<input className="form-control" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, username, or email" /></label>
      <label>Status<select className="form-control" value={status} onChange={(event) => setStatus(event.target.value as PrivacyRequestStatus | 'all')}>{statusOptions.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : item.replace('_', ' ')}</option>)}</select></label>
      <label>Request type<select className="form-control" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="all">All types</option><option value="export">Export</option><option value="anonymization">Anonymization</option></select></label>
    </div>

    <section className="wt-admin-section" style={{ marginTop: 14 }}>
      <header className="wt-admin-section-header"><div><h2>Request queue</h2><p>{filtered.length} of {requests.length} requests</p></div><button className="btn btn-default btn-sm" type="button" disabled={loading} onClick={() => void load()}><i className={`fa fa-${loading ? 'spinner fa-spin' : 'refresh'}`} /> Refresh</button></header>
      <div className="wt-admin-section-body flush">{loading ? <div className="wt-admin-section-body">Loading privacy requests…</div> : filtered.length ? <table className="wt-admin-table responsive"><thead><tr><th>Request</th><th>Subject</th><th>Status</th><th>Submitted</th><th>Hold</th><th /></tr></thead><tbody>{filtered.map((request) => <tr key={request.id}>
        <td data-label="Request"><strong>{request.reference}</strong><small>{request.type}</small></td>
        <td data-label="Subject"><strong>{subjectName(request)}</strong><small>{request.subject?.email || 'Identity already anonymized or unavailable'}</small></td>
        <td data-label="Status"><span className={`wt-privacy-status ${request.status}`}>{request.status.replace('_', ' ')}</span></td>
        <td data-label="Submitted">{dateTime(request.createDate)}</td><td data-label="Hold">{request.legalHold.active ? <span className="wt-admin-state unavailable">Active</span> : 'No'}</td>
        <td data-label="Action"><button className="btn btn-primary btn-sm" type="button" onClick={() => { setSelected(request); setPreview(null); setNote(''); setConfirmation(''); }}>Review</button></td>
      </tr>)}</tbody></table> : <div className="wt-admin-section-body"><p>No privacy requests match these filters.</p></div>}</div>
    </section>

    {selected ? <><div className="wt-admin-drawer-backdrop" aria-hidden="true" onClick={() => !busy && setSelected(null)} /><aside className="wt-admin-drawer wt-privacy-drawer" role="dialog" aria-modal="true" aria-labelledby="privacy-review-title">
      <header className="wt-admin-drawer-header"><div><h2 id="privacy-review-title">{selected.reference}</h2><p>{subjectName(selected)} · {selected.type}</p></div><button className="close" type="button" aria-label="Close privacy review" disabled={busy} onClick={() => setSelected(null)}>×</button></header>
      <div className="wt-privacy-review-strip"><span className={`wt-privacy-status ${selected.status}`}>{selected.status.replace('_', ' ')}</span>{selected.legalHold.active ? <span className="wt-admin-state unavailable"><i className="fa fa-lock" /> Legal hold</span> : null}</div>
      <section className="wt-admin-preview-block"><h3>Request details</h3><dl className="wt-admin-detail-list"><div className="wt-admin-detail-row"><dt>Subject</dt><dd>{subjectName(selected)}<br /><small>{selected.subject?.email || 'Email removed or unavailable'}</small></dd></div><div className="wt-admin-detail-row"><dt>Submitted</dt><dd>{dateTime(selected.createDate)}</dd></div><div className="wt-admin-detail-row"><dt>Reason</dt><dd>{selected.reason || 'No reason supplied.'}</dd></div></dl></section>
      {selected.type === 'anonymization' ? <section className="wt-admin-preview-block"><h3>Impact preview</h3>{preview ? <><div className="wt-privacy-impact-grid">{Object.entries(preview.request.preview.counts).map(([key, value]) => <div key={key}><strong>{Number(value).toLocaleString()}</strong><small>{key}</small></div>)}</div>{preview.request.preview.blockers.length ? <div className="alert alert-danger">{preview.request.preview.blockers.map((blocker) => <div key={blocker}>{blocker}</div>)}</div> : <div className="wt-admin-safe-note">No execution blockers were found. Public contributions will retain the same user ID under a stable pseudonym.</div>}</> : <p className="text-muted">Generate a time-limited preview before execution.</p>}<button className="btn btn-default btn-sm" type="button" disabled={busy || !['in_review', 'approved'].includes(selected.status)} onClick={() => void runPreview()}><i className="fa fa-search" /> Generate preview</button></section> : null}
      <section className="wt-admin-preview-block"><h3>Review note</h3><textarea className="form-control" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record the evidence or reason for this decision" /><small>{note.length}/500</small></section>
      {selected.type === 'anonymization' && selected.status === 'approved' && preview ? <section className="wt-admin-preview-block"><div className="wt-admin-warning"><strong>This cannot be undone.</strong><p>Authentication is revoked, account PII is removed, and contribution attribution changes to a stable pseudonym.</p></div><label htmlFor="privacy-confirmation" style={{ marginTop: 12 }}>Type <code>{preview.confirmationPhrase}</code></label><input id="privacy-confirmation" className="form-control" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></section> : null}
      <section className="wt-admin-preview-block"><h3>Audit trail</h3><ol className="wt-privacy-timeline">{selected.timeline.slice().reverse().map((item, index) => <li key={`${item.at}-${index}`}><strong>{item.type.replace('_', ' ')}</strong><span>{dateTime(item.at)}</span>{item.note ? <p>{item.note}</p> : null}</li>)}</ol></section>
      <footer className="wt-privacy-action-footer">
        {selected.legalHold.active ? <button className="btn btn-default" disabled={busy || note.trim().length < 3} onClick={() => void runAction('clear_hold')}>Clear hold</button> : !['completed', 'cancelled', 'rejected'].includes(selected.status) ? <button className="btn btn-default" disabled={busy || note.trim().length < 3} onClick={() => void runAction('hold')}><i className="fa fa-lock" /> Apply hold</button> : null}
        {['submitted', 'blocked', 'failed'].includes(selected.status) ? <button className="btn btn-primary" disabled={busy || note.trim().length < 3 || selected.legalHold.active} onClick={() => void runAction('review')}>{selected.status === 'failed' ? 'Return to review' : 'Start review'}</button> : null}
        {selected.status === 'in_review' ? <><button className="btn btn-danger" disabled={busy || note.trim().length < 3} onClick={() => void runAction('reject')}>Reject</button><button className="btn btn-primary" disabled={busy || selected.legalHold.active} onClick={() => void runAction('approve')}>Approve</button></> : null}
        {selected.status === 'approved' && selected.type === 'export' ? <button className="btn btn-success" disabled={busy} onClick={() => void runAction('execute')}><i className="fa fa-download" /> Prepare export</button> : null}
        {selected.status === 'approved' && selected.type === 'anonymization' ? <button className="btn btn-danger" disabled={busy || !preview || preview.request.preview.blockers.length > 0 || confirmation !== preview.confirmationPhrase} onClick={() => void runAction('execute')}><i className="fa fa-user-times" /> Execute anonymization</button> : null}
      </footer>
    </aside></> : null}
  </AdminOperationsShell>;
};

export default PrivacyRequestsPage;
