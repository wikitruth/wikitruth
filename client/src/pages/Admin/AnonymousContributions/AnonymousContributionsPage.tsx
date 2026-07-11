import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PageMeta from '../../../components/common/PageMeta';
import apiService from '../../../services/api';
import type { AnonymousContribution, AnonymousContributionStatus } from '../../../types/api';

const FILTERS: Array<AnonymousContributionStatus | 'all'> = ['pending', 'in_review', 'accepted', 'rejected', 'all'];

const AnonymousContributionsPage: React.FC = () => {
  const [status, setStatus] = useState<AnonymousContributionStatus | 'all'>('pending');
  const [submissions, setSubmissions] = useState<AnonymousContribution[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [adoptionUrls, setAdoptionUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: AnonymousContributionStatus | 'all') => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.listAnonymousContributions(nextStatus);
      setSubmissions(result.submissions || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load anonymous contributions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(status); }, [load, status]);

  const review = async (submission: AnonymousContribution, nextStatus: Exclude<AnonymousContributionStatus, 'pending'>) => {
    const id = String(submission._id || submission.id || '');
    if (!id) return;
    try {
      setActingId(id);
      setError(null);
      const result = await apiService.reviewAnonymousContribution(id, nextStatus, reasons[id] || 'Reviewed against contribution policy.');
      if (result.adoptionUrl) setAdoptionUrls((previous) => ({ ...previous, [id]: String(result.adoptionUrl) }));
      setSubmissions((previous) => previous.map((item) => {
        const itemId = String(item._id || item.id || '');
        return itemId === id ? { ...item, ...(result.submission || {}) } : item;
      }));
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to review contribution.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="container-fluid">
      <PageMeta title="Anonymous Contribution Queue" />
      <div className="page-header">
        <h2>Anonymous Contribution Queue</h2>
        <p className="text-muted">Screen privacy-preserving proposals before an authenticated editor adopts them.</p>
      </div>
      {error ? <Alert type="danger" dismissible onDismiss={() => setError(null)}>{error}</Alert> : null}
      <div className="btn-group" role="group" aria-label="Submission status filter" style={{ marginBottom: 18 }}>
        {FILTERS.map((filter) => (
          <Button key={filter} variant={status === filter ? 'primary' : 'default'} onClick={() => setStatus(filter)}>
            {filter.replace('_', ' ')}
          </Button>
        ))}
      </div>
      {loading ? <LoadingSpinner message="Loading anonymous contributions..." /> : null}
      {!loading && submissions.length === 0 ? <Alert type="info">No {status === 'all' ? '' : status.replace('_', ' ')} submissions.</Alert> : null}
      {submissions.map((submission) => {
        const id = String(submission._id || submission.id || '');
        const adoptionUrl = adoptionUrls[id] || (submission.status === 'accepted' ? `/${submission.entryType === 'opinion' ? 'opinions' : `${submission.entryType}s`}/create?anonymousSubmission=${encodeURIComponent(id)}` : '');
        return (
          <article className="panel panel-default" key={id}>
            <div className="panel-heading">
              <strong>{submission.title}</strong>{' '}
              <span className="label label-default">{submission.entryType}</span>{' '}
              <span className={`label label-${submission.status === 'accepted' ? 'success' : submission.status === 'rejected' ? 'danger' : 'warning'}`}>{submission.status.replace('_', ' ')}</span>
            </div>
            <div className="panel-body">
              <p style={{ whiteSpace: 'pre-wrap' }}>{submission.content}</p>
              {submission.references ? <p><strong>References:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{submission.references}</span></p> : null}
              {submission.parentId ? <p><strong>Context:</strong> {submission.parentType || 'entry'} <code>{submission.parentId}</code></p> : null}
              <p className="text-muted">
                Risk score: {submission.risk?.score || 0}
                {submission.risk?.flags?.length ? ` (${submission.risk.flags.join(', ')})` : ' (no automated flags)'}
              </p>
              {submission.moderation?.reason ? <Alert type="info">Review note: {submission.moderation.reason}</Alert> : null}
              {submission.status !== 'accepted' && submission.status !== 'rejected' ? (
                <div className="form-group">
                  <label htmlFor={`reason-${id}`}>Review reason</label>
                  <textarea id={`reason-${id}`} className="form-control" rows={2} value={reasons[id] || ''} onChange={(event) => setReasons((previous) => ({ ...previous, [id]: event.target.value }))} placeholder="Explain the screening decision" />
                </div>
              ) : null}
              {submission.status === 'pending' ? <Button disabled={actingId === id} onClick={() => void review(submission, 'in_review')}>Start review</Button> : null}{' '}
              {submission.status === 'pending' || submission.status === 'in_review' ? (
                <>
                  <Button variant="success" disabled={actingId === id} onClick={() => void review(submission, 'accepted')}>Accept for adoption</Button>{' '}
                  <Button variant="danger" disabled={actingId === id} onClick={() => void review(submission, 'rejected')}>Reject</Button>
                </>
              ) : null}
              {adoptionUrl ? <p style={{ marginTop: 12 }}><Link className="btn btn-primary" to={adoptionUrl}>Adopt in authenticated editor</Link></p> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default AnonymousContributionsPage;
