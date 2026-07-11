import React from 'react';

import { useAuth } from '../../context/AuthContext';
import moderationApi, {
  type ChangeRequest,
  type ModerationTarget,
} from '../../services/api/moderation';

interface ChangeRequestPanelProps {
  target: ModerationTarget;
}

const ChangeRequestPanel: React.FC<ChangeRequestPanelProps> = ({ target }) => {
  const { user, isAuthenticated } = useAuth();
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [requests, setRequests] = React.useState<ChangeRequest[]>([]);
  const [selectedFields, setSelectedFields] = React.useState<Record<string, string[]>>({});
  const [decisionNotes, setDecisionNotes] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canReview = Boolean(user?.roles?.reviewer || user?.roles?.admin);
  const canViewQueue = Boolean(canReview || user?.roles?.screener);

  const loadRequests = React.useCallback(async () => {
    if (!canViewQueue) {
      return;
    }
    try {
      const response = await moderationApi.listChangeRequests(target);
      setRequests(response.requests || []);
      setSelectedFields((current) => {
        const next = { ...current };
        response.requests.forEach((request) => {
          if (!next[request._id]) {
            next[request._id] = Object.keys(request.proposedChanges || {});
          }
        });
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load change requests');
    }
  }, [canViewQueue, target]);

  React.useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const proposedChanges: Record<string, unknown> = {};
    if (title.trim()) {
      proposedChanges.title = title.trim();
    }
    if (content.trim()) {
      proposedChanges.content = content.trim();
      proposedChanges.contentPreview = content.trim().slice(0, 240);
    }
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await moderationApi.submitChangeRequest(target, { proposedChanges, summary: summary.trim() });
      setTitle('');
      setContent('');
      setSummary('');
      setMessage('Suggestion submitted for review.');
      await loadRequests();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit suggestion');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (requestId: string, field: string) => {
    setSelectedFields((current) => {
      const fields = new Set(current[requestId] || []);
      if (fields.has(field)) {
        fields.delete(field);
      } else {
        fields.add(field);
      }
      return { ...current, [requestId]: Array.from(fields) };
    });
  };

  const resolve = async (request: ChangeRequest, action: 'accept' | 'reject') => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await moderationApi.resolveChangeRequest(request._id, {
        action,
        acceptedFields: action === 'accept' ? selectedFields[request._id] || [] : undefined,
        decisionNote: String(decisionNotes[request._id] || '').trim(),
      });
      setMessage(action === 'accept' ? 'Change request applied.' : 'Change request rejected.');
      await loadRequests();
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Unable to resolve change request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel panel-default" aria-labelledby="change-request-heading">
      <div className="panel-heading">
        <strong id="change-request-heading">Suggestions and Change Requests</strong>
      </div>
      <div className="panel-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {message ? <div className="alert alert-success">{message}</div> : null}

        {isAuthenticated ? (
          <form onSubmit={submit}>
            <p className="text-muted">Suggest selected fields without directly overwriting the current entry.</p>
            <div className="form-group">
              <label htmlFor="suggested-title">Suggested title (optional)</label>
              <input id="suggested-title" className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="suggested-content">Suggested content (optional)</label>
              <textarea id="suggested-content" className="form-control" rows={5} value={content} onChange={(event) => setContent(event.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="suggestion-summary">Reason for this suggestion</label>
              <input id="suggestion-summary" className="form-control" value={summary} onChange={(event) => setSummary(event.target.value)} minLength={10} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || summary.trim().length < 10 || (!title.trim() && !content.trim())}>
              {loading ? 'Submitting...' : 'Submit Suggestion'}
            </button>
          </form>
        ) : (
          <p className="text-muted">Sign in to submit a suggestion.</p>
        )}

        {canViewQueue ? <hr /> : null}
        {canViewQueue && requests.length === 0 ? <p className="text-muted">No change requests for this entry.</p> : null}
        {canViewQueue ? requests.map((request) => {
          const fields = Object.keys(request.proposedChanges || {});
          return (
            <div className="well well-sm" key={request._id}>
              <div className="clearfix">
                <strong>{request.summary}</strong>
                <span className="label label-default pull-right">{request.status.replace('_', ' ')}</span>
              </div>
              <p className="text-muted"><small>Revision {request.baseRevisionNumber} by {request.createUsername || 'contributor'}</small></p>
              {fields.map((field) => (
                <div className="checkbox" key={field}>
                  <label>
                    <input
                      type="checkbox"
                      checked={(selectedFields[request._id] || []).includes(field)}
                      onChange={() => toggleField(request._id, field)}
                      disabled={!canReview || request.status !== 'open'}
                    />{' '}
                    <code>{field}</code>: {String(request.proposedChanges[field] ?? '')}
                  </label>
                </div>
              ))}
              {canReview && request.status === 'open' ? (
                <>
                  <div className="form-group">
                    <label htmlFor={`decision-${request._id}`}>Decision note</label>
                    <input
                      id={`decision-${request._id}`}
                      className="form-control"
                      value={decisionNotes[request._id] || ''}
                      onChange={(event) => setDecisionNotes((current) => ({ ...current, [request._id]: event.target.value }))}
                      minLength={5}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    disabled={loading || (selectedFields[request._id] || []).length === 0 || (decisionNotes[request._id] || '').trim().length < 5}
                    onClick={() => void resolve(request, 'accept')}
                  >
                    Accept Selected Fields
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={loading || (decisionNotes[request._id] || '').trim().length < 5}
                    onClick={() => void resolve(request, 'reject')}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          );
        }) : null}
      </div>
    </section>
  );
};

export default ChangeRequestPanel;

