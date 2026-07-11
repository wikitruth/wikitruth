import React from 'react';

import { useAuth } from '../../context/AuthContext';
import moderationApi from '../../services/api/moderation';
import type { Issue, Opinion } from '../../types';

function canReview(user: ReturnType<typeof useAuth>['user']): boolean {
  return Boolean(user?.roles?.reviewer || user?.roles?.admin);
}

export const IssueResolutionPanel: React.FC<{ issue: Issue }> = ({ issue }) => {
  const { user } = useAuth();
  const [resolution, setResolution] = React.useState(issue.resolution || { status: 'open' as const });
  const [status, setStatus] = React.useState<'resolved' | 'dismissed'>('resolved');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const result = await moderationApi.resolveIssue(issue._id, { status, reason: reason.trim() });
      setResolution((result.resolution as Issue['resolution']) || {});
      setReason('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to resolve issue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`alert ${resolution.status === 'open' ? 'alert-warning' : 'alert-success'}`} aria-label="Issue resolution">
      <strong>Issue status: {resolution.status || 'open'}</strong>
      {resolution.reason ? <p style={{ marginBottom: 0 }}>{resolution.reason}</p> : null}
      {canReview(user) && resolution.status === 'open' ? (
        <div style={{ marginTop: 12 }}>
          {error ? <p className="text-danger">{error}</p> : null}
          <div className="form-inline">
            <select className="form-control" aria-label="Resolution status" value={status} onChange={(event) => setStatus(event.target.value as 'resolved' | 'dismissed')} disabled={saving}>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>{' '}
            <input className="form-control" aria-label="Resolution reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (at least 10 characters)" disabled={saving} />{' '}
            <button type="button" className="btn btn-warning" onClick={() => void save()} disabled={saving || reason.trim().length < 10}>
              {saving ? 'Recording...' : 'Record Decision'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export const CommentRevisionNotice: React.FC<{ opinion: Opinion }> = ({ opinion }) => {
  const { user } = useAuth();
  const [context, setContext] = React.useState(opinion.discussionContext || {});
  const [decision, setDecision] = React.useState<'relevant' | 'obsolete'>('relevant');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const status = context.status || 'current';
  if (status === 'current' && !context.revisionNumber) return null;

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const result = await moderationApi.reviewCommentRelevance(opinion._id, { status: decision, reason: reason.trim() });
      setContext(result.discussionContext as Opinion['discussionContext'] || {});
      setReason('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to review comment relevance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`alert ${status === 'potentially_obsolete' || status === 'obsolete' ? 'alert-warning' : 'alert-info'}`} aria-label="Comment revision context">
      <strong>{status === 'potentially_obsolete' ? 'This comment may refer to an older entry revision.' : `Comment relevance: ${status}`}</strong>
      <p style={{ marginBottom: 0 }}>
        Posted against revision {context.revisionNumber || 'unknown'}
        {context.supersededByRevisionNumber ? `; entry is now at revision ${context.supersededByRevisionNumber}` : ''}.
      </p>
      {context.reason ? <p style={{ marginBottom: 0 }}>{context.reason}</p> : null}
      {canReview(user) && status === 'potentially_obsolete' ? (
        <div style={{ marginTop: 12 }}>
          {error ? <p className="text-danger">{error}</p> : null}
          <div className="form-inline">
            <select className="form-control" aria-label="Comment relevance decision" value={decision} onChange={(event) => setDecision(event.target.value as 'relevant' | 'obsolete')} disabled={saving}>
              <option value="relevant">Still relevant</option>
              <option value="obsolete">Obsolete</option>
            </select>{' '}
            <input className="form-control" aria-label="Comment relevance reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (at least 10 characters)" disabled={saving} />{' '}
            <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving || reason.trim().length < 10}>
              {saving ? 'Recording...' : 'Record Relevance'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
