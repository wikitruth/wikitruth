import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageMeta from '../../components/common/PageMeta';
import { useAuth } from '../../context/AuthContext';
import civicApi from '../../services/api/civic';
import type { CivicRecord, CivicRecordStage, CivicRecordStatus } from '../../types/civic';

const CivicRecordPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { activeRole } = useAuth();
  const [record, setRecord] = useState<CivicRecord | null>(null);
  const [parent, setParent] = useState<CivicRecord | null>(null);
  const [children, setChildren] = useState<CivicRecord[]>([]);
  const [related, setRelated] = useState<CivicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CivicRecordStatus>('pending');
  const [stage, setStage] = useState<CivicRecordStage>('reported');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await civicApi.entry(id);
      setRecord(result.record);
      setParent(result.parent || null);
      setChildren(result.children || []);
      setRelated(result.related || []);
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
    try {
      const result = await civicApi.transition(record._id, { status, stage, reason });
      setRecord(result.record);
      setReason('');
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : 'Unable to record this decision.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading civic record..." />;
  if (error && !record) return <div className="alert alert-danger">{error}</div>;
  if (!record) return <div className="alert alert-warning">Civic record not found.</div>;

  const location = [record.location?.address, record.location?.barangay, record.location?.city, record.location?.province, record.location?.region].filter(Boolean).join(', ');
  const canReview = activeRole === 'reviewer' || activeRole === 'admin';

  return (
    <div className="wt-civic-page wt-civic-detail">
      <PageMeta title={record.title} description={record.summary || record.description || 'FixPH civic accountability record'} />
      <div className="wt-civic-detail-breadcrumb"><Link to="/civic">Fix The Philippines</Link><span>/</span><Link to={`/civic/${record.kind === 'person' ? 'people' : record.kind === 'institution' || record.kind === 'office' ? 'organizations' : record.kind === 'candidate' || record.kind === 'election' ? 'elections' : `${record.kind}s`}`}>{record.kind}</Link></div>
      <header className="wt-civic-detail-header">
        <div><span className="wt-civic-kicker">{record.kind.replace('_', ' ')}</span><h1>{record.title}</h1><p>{record.summary}</p></div>
        <div className="wt-civic-detail-state"><span>{record.status}</span><strong>{record.stage.replace('_', ' ')}</strong></div>
      </header>
      <div className="row">
        <main className="col-md-8">
          <section className="wt-civic-detail-panel"><h2>Public record</h2><p className="wt-civic-description">{record.description || 'No extended description has been recorded.'}</p></section>
          {record.project && <section className="wt-civic-detail-panel"><h2>Project accountability</h2><dl className="wt-civic-facts"><div><dt>Budget</dt><dd>{typeof record.project.budget === 'number' ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: record.project.currency || 'PHP' }).format(record.project.budget) : 'Not recorded'}</dd></div><div><dt>Contractor</dt><dd>{record.project.contractor || 'Not recorded'}</dd></div><div><dt>Contract</dt><dd>{record.project.contractReference || 'Not recorded'}</dd></div><div><dt>Progress</dt><dd>{typeof record.project.progressPercent === 'number' ? `${record.project.progressPercent}%` : 'Not recorded'}</dd></div></dl></section>}
          {record.election && <section className="wt-civic-detail-panel"><h2>Election record</h2><dl className="wt-civic-facts"><div><dt>Position</dt><dd>{record.election.position || 'Not recorded'}</dd></div><div><dt>Jurisdiction</dt><dd>{record.election.jurisdiction || 'Not recorded'}</dd></div><div><dt>Election date</dt><dd>{record.election.electionDate ? new Date(record.election.electionDate).toLocaleDateString() : 'Not recorded'}</dd></div></dl>{record.election.platform && <><h3>Platform evidence</h3><p>{record.election.platform}</p></>}</section>}
          {record.outcome?.summary && <section className="wt-civic-detail-panel wt-civic-outcome"><span className="wt-civic-kicker">Documented outcome</span><h2>{record.outcome.summary}</h2>{record.outcome.happenedAt && <time>{new Date(record.outcome.happenedAt).toLocaleDateString()}</time>}</section>}
          <section className="wt-civic-detail-panel"><h2>Accountability history</h2>{record.history?.length ? <ol className="wt-civic-history">{[...record.history].reverse().map((item, index) => <li key={item._id || `${item.date}-${index}`}><time>{new Date(item.date).toLocaleString()}</time><strong>{item.summary}</strong>{item.reason && <p>{item.reason}</p>}<small>{item.actorUsername ? `Recorded by ${item.actorUsername}` : 'System record'}</small></li>)}</ol> : <p>No lifecycle history is available.</p>}</section>
        </main>
        <aside className="col-md-4">
          <section className="wt-civic-detail-panel"><h2>At a glance</h2><dl className="wt-civic-facts stacked"><div><dt>Severity</dt><dd>{record.severity}</dd></div><div><dt>Location</dt><dd>{location || 'Not specified'}</dd></div><div><dt>Last updated</dt><dd>{record.editDate ? new Date(record.editDate).toLocaleString() : 'Unknown'}</dd></div>{parent && <div><dt>Part of</dt><dd><Link to={`/civic/records/${parent._id}`}>{parent.title}</Link></dd></div>}</dl></section>
          {(children.length > 0 || related.length > 0) && <section className="wt-civic-detail-panel"><h2>Connected records</h2><ul className="list-unstyled">{[...children, ...related].map((item) => <li key={item._id}><Link to={`/civic/records/${item._id}`}>{item.title}</Link><small>{item.kind}</small></li>)}</ul></section>}
          {canReview && <form className="wt-civic-detail-panel" onSubmit={transition}><h2>Record a decision</h2><div className="form-group"><label htmlFor="civic-status">Status</label><select id="civic-status" className="form-control" value={status} onChange={(event) => setStatus(event.target.value as CivicRecordStatus)}>{['draft', 'pending', 'active', 'verified', 'resolved', 'archived'].map((value) => <option key={value}>{value}</option>)}</select></div><div className="form-group"><label htmlFor="civic-stage">Stage</label><select id="civic-stage" className="form-control" value={stage} onChange={(event) => setStage(event.target.value as CivicRecordStage)}>{['reported', 'screening', 'investigating', 'action_planned', 'in_progress', 'resolved', 'closed'].map((value) => <option key={value}>{value}</option>)}</select></div><div className="form-group"><label htmlFor="civic-reason">Reason</label><textarea id="civic-reason" className="form-control" required minLength={10} value={reason} onChange={(event) => setReason(event.target.value)} /></div><button className="btn btn-primary btn-block" type="submit">Record decision</button>{error && <p className="text-danger">{error}</p>}</form>}
        </aside>
      </div>
    </div>
  );
};

export default CivicRecordPage;
