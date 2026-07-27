import React, { useCallback, useEffect, useState } from 'react';
import civicApi from '../../services/api/civic';
import type { CivicResponseRequest } from '../../types/civic';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { useCivicTenant } from '../../context/CivicTenantContext';

const CivicResponsesPanel: React.FC<{ recordId: string }> = ({ recordId }) => {
  const { hasRole, tenant } = useCivicTenant();
  const [responses, setResponses] = useState<CivicResponseRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState<CivicResponseRequest['requestType']>('subject_response');
  const [relationship, setRelationship] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [evidence, setEvidence] = useState('');
  const [reviewReason, setReviewReason] = useState('Reviewed against the civic record and submitted evidence.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canContribute = hasRole('contributor', 'admin');
  const canReview = hasRole('reviewer', 'admin');
  const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(tenant.localization.defaultLocale, { dateStyle: 'medium', timeZone: tenant.localization.timezone }).format(new Date(value)) : '';

  const load = useCallback(async () => {
    try { setResponses((await civicApi.responses(recordId)).responses || []); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load responses'); }
  }, [recordId]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await civicApi.submitResponse(recordId, {
        requestType, title, content, claimedRelationship: relationship,
        evidenceUrls: evidence.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      });
      setTitle(''); setContent(''); setEvidence(''); setShowForm(false); await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to submit response'); }
    finally { setBusy(false); }
  };

  const review = async (response: CivicResponseRequest, action: 'publish' | 'reject' | 'resolve') => {
    setBusy(true); setError('');
    try { await civicApi.reviewResponse(response._id, action, reviewReason); await load(); }
    catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'Unable to review response'); }
    finally { setBusy(false); }
  };

  return (
    <section className="wt-civic-detail-panel" aria-labelledby="civic-response-heading">
      <div className="clearfix"><h2 id="civic-response-heading" className="pull-left">Subject responses and corrections</h2>{canContribute ? <button type="button" className="btn btn-default btn-sm pull-right" onClick={() => setShowForm((value) => !value)}>Submit response</button> : null}</div>
      <p className="text-muted">Claims of relationship are contributor-provided. Responses are published only after tenant review and do not silently alter the underlying record.</p>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {showForm ? <form className="well" onSubmit={submit}>
        <div className="form-group"><label htmlFor="civic-response-type">Request type</label><select id="civic-response-type" className="form-control" value={requestType} onChange={(event) => setRequestType(event.target.value as CivicResponseRequest['requestType'])}><option value="subject_response">Subject response</option><option value="correction_request">Correction request</option></select></div>
        <div className="form-group"><label htmlFor="civic-response-relationship">Claimed relationship to this record</label><input id="civic-response-relationship" className="form-control" value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="for example: named official, agency representative, contractor" /></div>
        <div className="form-group"><label htmlFor="civic-response-title">Title</label><input id="civic-response-title" className="form-control" required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="form-group"><label htmlFor="civic-response-content">Response or requested correction</label><textarea id="civic-response-content" className="form-control" rows={6} required minLength={20} value={content} onChange={(event) => setContent(event.target.value)} /></div>
        <div className="form-group"><label htmlFor="civic-response-evidence">Supporting HTTPS URLs, one per line</label><textarea id="civic-response-evidence" className="form-control" rows={3} value={evidence} onChange={(event) => setEvidence(event.target.value)} /></div>
        <button className="btn btn-primary" disabled={busy} type="submit">Submit for review</button>
      </form> : null}
      {canReview && responses.some((response) => response.status === 'pending') ? <div className="form-group"><label htmlFor="civic-response-review-reason">Review reason</label><input id="civic-response-review-reason" className="form-control" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} /></div> : null}
      {responses.length ? <div className="list-group">{responses.map((response) => <article className="list-group-item" key={response._id}>
        <span className={`label label-${response.status === 'published' || response.status === 'resolved' ? 'success' : response.status === 'pending' ? 'warning' : 'default'}`}>{response.status}</span>{' '}
        <span className="label label-info">{response.requestType.replace('_', ' ')}</span>
        <h3>{response.title}</h3>
        {response.claimedRelationship ? <p><strong>Claimed relationship:</strong> {response.claimedRelationship}</p> : null}
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(response.content) }} />
        {response.evidenceUrls?.length ? <ul>{response.evidenceUrls.map((url) => <li key={url}><a href={url} rel="noopener noreferrer" target="_blank">{url}</a></li>)}</ul> : null}
        <small className="text-muted">Submitted by {response.createUsername || 'a tenant contributor'} {formatDate(response.createDate)}</small>
        {response.reviewReason ? <p className="text-muted"><strong>Review:</strong> {response.reviewReason}</p> : null}
        {canReview && response.status === 'pending' ? <p style={{ marginTop: 8 }}><button type="button" className="btn btn-success btn-xs" disabled={busy} onClick={() => void review(response, 'publish')}>Publish</button>{' '}<button type="button" className="btn btn-default btn-xs" disabled={busy} onClick={() => void review(response, 'reject')}>Reject</button>{' '}<button type="button" className="btn btn-info btn-xs" disabled={busy} onClick={() => void review(response, 'resolve')}>Resolve correction</button></p> : null}
      </article>)}</div> : <p>No published subject responses or correction requests.</p>}
    </section>
  );
};

export default CivicResponsesPanel;
