import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import privacyApi, { type PrivacyRequest, type PrivacyRequestType } from '../../services/api/privacy';
import PageMeta from '../../components/common/PageMeta';
import './privacyOperations.css';
import '../Admin/adminOperations.css';

function statusLabel(status: string): string {
  return status.replace('_', ' ');
}

function dateTime(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

const PrivacyPage: React.FC = () => {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [requestType, setRequestType] = useState<PrivacyRequestType | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRequests(await privacyApi.requests()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load privacy requests.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!requestType) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const request = await privacyApi.createRequest(requestType, reason.trim());
      setMessage(`Request ${request.reference} was submitted.`); setRequestType(null); setReason(''); await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to submit privacy request.'); }
    finally { setBusy(false); }
  };

  const cancel = async (request: PrivacyRequest) => {
    setBusy(true); setError(null); setMessage(null);
    try { await privacyApi.cancelRequest(request.id); setMessage(`Request ${request.reference} was cancelled.`); await load(); }
    catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel privacy request.'); }
    finally { setBusy(false); }
  };

  const download = async (request: PrivacyRequest) => {
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await privacyApi.downloadExport(request.id);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = result.filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setMessage('Your privacy export was downloaded and the one-time authorization was consumed.'); await load();
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : 'Unable to download privacy export.'); }
    finally { setBusy(false); }
  };

  return <main className="wt-privacy-page">
    <PageMeta title="Privacy & data" />
    <header className="wt-privacy-page-header"><div><span className="wt-privacy-eyebrow"><i className="fa fa-shield" /> Account controls</span><h1>Privacy & data</h1><p>Request a portable copy of your Wikitruth data or ask us to anonymize your account while preserving public contributions under a stable pseudonym.</p></div><Link className="btn btn-default" to="/account/settings">Back to settings</Link></header>
    {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
    {message ? <div className="alert alert-success" role="status">{message}</div> : null}

    <section className="wt-privacy-choice-grid" aria-label="New privacy request">
      <article><span className="wt-privacy-choice-icon"><i className="fa fa-download" /></span><div><h2>Export my data</h2><p>Receive a JSON copy of account data, contributions, activity, and security history. The approved download is authenticated, expires, and can be used once.</p><button className="btn btn-primary" type="button" disabled={busy} onClick={() => { setRequestType('export'); setReason(''); }}>Request an export</button></div></article>
      <article className="danger"><span className="wt-privacy-choice-icon"><i className="fa fa-user-times" /></span><div><h2>Anonymize my account</h2><p>Remove account identity and private activity, revoke authentication, and retain public contribution history under an anonymous stable name.</p><button className="btn btn-default" type="button" disabled={busy} onClick={() => { setRequestType('anonymization'); setReason(''); }}>Request anonymization</button></div></article>
    </section>

    <section className="wt-privacy-request-list">
      <header><div><h2>Your requests</h2><p>Each status change remains visible here.</p></div><button className="btn btn-default btn-sm" type="button" disabled={loading || busy} onClick={() => void load()}><i className={`fa fa-${loading ? 'spinner fa-spin' : 'refresh'}`} /> Refresh</button></header>
      {loading ? <p className="wt-privacy-empty">Loading requests…</p> : requests.length ? requests.map((request) => <article className="wt-privacy-request" key={request.id}>
        <div className="wt-privacy-request-main"><span className={`wt-privacy-status ${request.status}`}>{statusLabel(request.status)}</span><h3>{request.type === 'export' ? 'Data export' : 'Account anonymization'}</h3><code>{request.reference}</code><p>Submitted {dateTime(request.createDate)}</p>{request.legalHold.active ? <div className="wt-privacy-hold"><i className="fa fa-lock" /> This request is on legal hold.</div> : null}</div>
        <ol className="wt-privacy-timeline">{request.timeline.slice(-4).reverse().map((item, index) => <li key={`${item.at}-${index}`}><strong>{statusLabel(item.type)}</strong><span>{dateTime(item.at)}</span>{item.note ? <p>{item.note}</p> : null}</li>)}</ol>
        <div className="wt-privacy-request-actions">
          {request.type === 'export' && request.status === 'ready' ? <button className="btn btn-success" type="button" disabled={busy} onClick={() => void download(request)}><i className="fa fa-download" /> Download once</button> : null}
          {['submitted', 'in_review'].includes(request.status) ? <button className="btn btn-default" type="button" disabled={busy} onClick={() => void cancel(request)}>Cancel request</button> : null}
          {request.download.readyExpiresAt && request.status === 'ready' ? <small>Available until {dateTime(request.download.readyExpiresAt)}</small> : null}
        </div>
      </article>) : <p className="wt-privacy-empty">You have not submitted a privacy request.</p>}
    </section>

    {requestType ? <><div className="wt-admin-drawer-backdrop" aria-hidden="true" onClick={() => !busy && setRequestType(null)} /><aside className="wt-admin-drawer wt-privacy-drawer" role="dialog" aria-modal="true" aria-labelledby="privacy-request-title">
      <header className="wt-admin-drawer-header"><div><h2 id="privacy-request-title">{requestType === 'export' ? 'Request a data export' : 'Request account anonymization'}</h2><p>We will notify you when the request status changes.</p></div><button className="close" type="button" aria-label="Close privacy request" onClick={() => setRequestType(null)}>×</button></header>
      {requestType === 'anonymization' ? <div className="wt-privacy-critical-note"><i className="fa fa-exclamation-triangle" /><div><strong>Anonymization is permanent after approval and execution.</strong><p>Your sign-in methods and private account activity are removed. Public contribution records remain attributed to a stable pseudonym.</p></div></div> : <div className="wt-admin-safe-note">No export file is stored on disk. The server builds it only after a short-lived one-time authorization is issued to your authenticated session.</div>}
      <div className="form-group" style={{ marginTop: 20 }}><label htmlFor="privacy-reason">Anything the reviewer should know? <span className="text-muted">Optional</span></label><textarea id="privacy-reason" className="form-control" rows={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /><small>{reason.length}/500</small></div>
      <footer className="wt-admin-drawer-footer"><button className="btn btn-default" type="button" disabled={busy} onClick={() => setRequestType(null)}>Cancel</button><button className={`btn btn-${requestType === 'anonymization' ? 'danger' : 'primary'}`} type="button" disabled={busy} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit request'}</button></footer>
    </aside></> : null}
  </main>;
};

export default PrivacyPage;
