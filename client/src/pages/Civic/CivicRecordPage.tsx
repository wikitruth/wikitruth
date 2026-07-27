import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageMeta from '../../components/common/PageMeta';
import { useCivicTenant } from '../../context/CivicTenantContext';
import civicApi from '../../services/api/civic';
import type { CivicEntryLink, CivicEntryRelationship, CivicRecord, CivicRecordStage, CivicRecordStatus } from '../../types/civic';
import CivicRecordForm from './CivicRecordForm';
import { CivicExtensionDetails } from './CivicExtensionFields';
import { civicSectionsForTenant } from './civicSections';
import CivicResponsesPanel from './CivicResponsesPanel';

const LINK_LABELS: Record<CivicEntryRelationship, string> = {
  subject: 'Topic / subject', claim: 'Claim / argument', question: 'Question', answer: 'Answer', evidence: 'Artifact / evidence',
  discussion: 'Discussion / opinion', review_issue: 'Review issue',
};

const CivicRecordPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { tenant, jurisdictions, actor, hasRole } = useCivicTenant();
  const [record, setRecord] = useState<CivicRecord | null>(null);
  const [parent, setParent] = useState<CivicRecord | null>(null);
  const [children, setChildren] = useState<CivicRecord[]>([]);
  const [related, setRelated] = useState<CivicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<CivicRecordStatus>('pending');
  const [stage, setStage] = useState<CivicRecordStage>('reported');
  const [reason, setReason] = useState('');
  const [links, setLinks] = useState<CivicEntryLink[]>([]);
  const [relationship, setRelationship] = useState<CivicEntryRelationship>('evidence');
  const [linkedEntryId, setLinkedEntryId] = useState('');
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await civicApi.entry(id);
      setRecord(result.record);
      setParent(result.parent || null);
      setChildren(result.children || []);
      setRelated(result.related || []);
      setLinks(result.links || []);
      setStatus(result.record.status);
      setStage(result.record.stage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this civic record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const transition = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;
    setError(null);
    setMessage(null);
    try {
      const result = await civicApi.transition(record._id, { status, stage, reason });
      setRecord(result.record);
      setReason('');
      setMessage('Lifecycle decision recorded.');
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : 'Unable to record this decision.');
    }
  };

  const addKnowledgeLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record || !linkedEntryId.trim()) return;
    setLinking(true);
    setError(null);
    setMessage(null);
    try {
      await civicApi.addLink(record._id, { relationship, objectId: linkedEntryId.trim() });
      const result = await civicApi.links(record._id);
      setLinks(result.links || []);
      setLinkedEntryId('');
      setMessage('Wikitruth entry linked.');
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Unable to link this Wikitruth entry.');
    } finally {
      setLinking(false);
    }
  };

  const removeKnowledgeLink = async (link: CivicEntryLink) => {
    if (!record || !link.linkId) return;
    setError(null);
    setMessage(null);
    try {
      await civicApi.removeLink(record._id, link.linkId);
      setLinks((current) => current.filter((item) => item.linkId !== link.linkId));
      setMessage('Wikitruth entry link removed.');
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Unable to remove this Wikitruth link.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading civic record..." />;
  if (error && !record) return <div className="alert alert-danger">{error}</div>;
  if (!record) return <div className="alert alert-warning">Civic record not found.</div>;

  const locationData = (record.location || {}) as Record<string, unknown>;
  const location = tenant.geography.addressFields.map((field) => String(locationData[field] || '')).filter(Boolean).join(', ');
  const isOwner = Boolean(actor.userId && String(record.createUserId || '') === actor.userId);
  const canEdit = hasRole('admin') || (hasRole('contributor') && isOwner);
  const canReview = hasRole('reviewer', 'admin');
  const canLink = canReview || (hasRole('contributor') && isOwner);
  const section = civicSectionsForTenant(tenant).find((item) => item.kinds.includes(record.kind));
  const jurisdiction = jurisdictions.find((item) => item._id === record.jurisdictionId);
  const formatDate = (value: string | Date) => new Intl.DateTimeFormat(tenant.localization.defaultLocale, { dateStyle: 'medium', timeStyle: 'short', timeZone: tenant.localization.timezone }).format(new Date(value));

  return (
    <div className="wt-civic-page wt-civic-detail">
      <PageMeta title={record.title} description={record.summary || record.description || `${tenant.title} civic accountability record`} />
      <div className="wt-civic-detail-breadcrumb"><Link to="/civic">{tenant.title}</Link><span>/</span><Link to={`/civic/${section?.slug || ''}`}>{section?.title || record.kind}</Link></div>
      <header className="wt-civic-detail-header">
        <div><span className="wt-civic-kicker">{record.kind.replace('_', ' ')}</span><h1>{record.title}</h1><p>{record.summary}</p></div>
        <div><div className="wt-civic-detail-state"><span>{record.status}</span><strong>{record.stage.replace('_', ' ')}</strong></div>{canEdit && <button className="btn btn-default btn-sm" style={{ marginTop: 10 }} type="button" onClick={() => setEditing((current) => !current)}>{editing ? 'Close editor' : 'Edit record'}</button>}</div>
      </header>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}
      {editing && <CivicRecordForm record={record} kinds={[record.kind]} tenant={tenant} jurisdictions={jurisdictions} onUpdated={(updated) => { setRecord(updated); setEditing(false); setMessage('Civic record details updated.'); }} onCancel={() => setEditing(false)} />}
      <div className="row">
        <main className="col-md-8">
          <section className="wt-civic-detail-panel"><h2>Public record</h2><p className="wt-civic-description">{record.description || 'No extended description has been recorded.'}</p></section>
          {record.project && <section className="wt-civic-detail-panel"><h2>Project accountability</h2><dl className="wt-civic-facts"><div><dt>Budget</dt><dd>{typeof record.project.budget === 'number' ? new Intl.NumberFormat(tenant.localization.defaultLocale, { style: 'currency', currency: record.project.currency || tenant.localization.currency }).format(record.project.budget) : 'Not recorded'}</dd></div><div><dt>Contractor</dt><dd>{record.project.contractor || 'Not recorded'}</dd></div><div><dt>Contract</dt><dd>{record.project.contractReference || 'Not recorded'}</dd></div><div><dt>Progress</dt><dd>{typeof record.project.progressPercent === 'number' ? `${record.project.progressPercent}%` : 'Not recorded'}</dd></div></dl></section>}
          {record.election && <section className="wt-civic-detail-panel"><h2>Election record</h2><dl className="wt-civic-facts"><div><dt>Position</dt><dd>{record.election.position || 'Not recorded'}</dd></div><div><dt>Jurisdiction</dt><dd>{record.election.jurisdiction || jurisdiction?.name || 'Not recorded'}</dd></div><div><dt>Election date</dt><dd>{record.election.electionDate ? formatDate(record.election.electionDate) : 'Not recorded'}</dd></div></dl>{record.election.platform && <><h3>Platform evidence</h3><p>{record.election.platform}</p></>}</section>}
          <CivicExtensionDetails tenant={tenant} kind={record.kind} values={record.extensions} />
          {links.length > 0 && <section className="wt-civic-detail-panel"><h2>Wikitruth knowledge and evidence</h2><ul className="wt-civic-knowledge-links">{links.map((item) => <li key={item.linkId || `${item.objectName}-${item.objectId}`}><div><span className="wt-civic-link-type">{LINK_LABELS[item.relationship]}</span><Link to={item.url}>{item.title}</Link>{item.contentPreview && <p>{item.contentPreview}</p>}{item.legacy && <small>Legacy civic reference</small>}</div>{canLink && item.linkId && <button className="btn btn-link btn-xs" type="button" onClick={() => void removeKnowledgeLink(item)}>Remove</button>}</li>)}</ul></section>}
          {record.outcome?.summary && <section className="wt-civic-detail-panel wt-civic-outcome"><span className="wt-civic-kicker">Documented outcome</span><h2>{record.outcome.summary}</h2>{record.outcome.happenedAt && <time>{formatDate(record.outcome.happenedAt)}</time>}</section>}
          <CivicResponsesPanel recordId={record._id} />
          <section className="wt-civic-detail-panel"><h2>Accountability history</h2>{record.history?.length ? <ol className="wt-civic-history">{[...record.history].reverse().map((item, index) => <li key={item._id || `${item.date}-${index}`}><time>{formatDate(item.date)}</time><strong>{item.summary}</strong>{item.reason && <p>{item.reason}</p>}<small>{item.actorUsername ? `Recorded by ${item.actorUsername}` : 'System record'}</small></li>)}</ol> : <p>No lifecycle history is available.</p>}</section>
        </main>
        <aside className="col-md-4">
          <section className="wt-civic-detail-panel"><h2>At a glance</h2><dl className="wt-civic-facts stacked"><div><dt>Severity</dt><dd>{record.severity}</dd></div><div><dt>Location</dt><dd>{location || jurisdiction?.name || 'Not specified'}</dd></div><div><dt>Country</dt><dd>{record.countryCode || tenant.countryCode}</dd></div><div><dt>Last updated</dt><dd>{record.editDate ? formatDate(record.editDate) : 'Unknown'}</dd></div>{parent && <div><dt>Part of</dt><dd><Link to={`/civic/records/${parent._id}`}>{parent.title}</Link></dd></div>}</dl></section>
          {(children.length > 0 || related.length > 0) && <section className="wt-civic-detail-panel"><h2>Connected records</h2><ul className="list-unstyled">{[...children, ...related].map((item) => <li key={item._id}><Link to={`/civic/records/${item._id}`}>{item.title}</Link><small>{item.kind}</small></li>)}</ul></section>}
          {canLink && tenant.featureFlags.knowledgeLinks !== false && <form className="wt-civic-detail-panel" onSubmit={addKnowledgeLink}><h2>Link Wikitruth knowledge</h2><div className="form-group"><label htmlFor="civic-link-type">Relationship</label><select id="civic-link-type" className="form-control" value={relationship} onChange={(event) => setRelationship(event.target.value as CivicEntryRelationship)}>{Object.entries(LINK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="form-group"><label htmlFor="civic-link-id">Wikitruth entry ID</label><input id="civic-link-id" className="form-control" required pattern="[a-fA-F0-9]{24}" value={linkedEntryId} onChange={(event) => setLinkedEntryId(event.target.value)} placeholder="24-character entry ID" /></div><button className="btn btn-default btn-block" disabled={linking} type="submit">{linking ? 'Linking...' : 'Link entry'}</button></form>}
          {canReview && <form className="wt-civic-detail-panel" onSubmit={transition}><h2>Record a decision</h2><div className="form-group"><label htmlFor="civic-status">Status</label><select id="civic-status" className="form-control" value={status} onChange={(event) => setStatus(event.target.value as CivicRecordStatus)}>{['draft', 'pending', 'active', 'verified', 'resolved', 'archived'].map((value) => <option key={value}>{value}</option>)}</select></div><div className="form-group"><label htmlFor="civic-stage">Stage</label><select id="civic-stage" className="form-control" value={stage} onChange={(event) => setStage(event.target.value as CivicRecordStage)}>{['reported', 'screening', 'investigating', 'action_planned', 'in_progress', 'resolved', 'closed'].map((value) => <option key={value}>{value}</option>)}</select></div><div className="form-group"><label htmlFor="civic-reason">Reason</label><textarea id="civic-reason" className="form-control" required minLength={10} value={reason} onChange={(event) => setReason(event.target.value)} /></div><button className="btn btn-primary btn-block" type="submit">Record decision</button></form>}
        </aside>
      </div>
    </div>
  );
};

export default CivicRecordPage;
