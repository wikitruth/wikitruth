import React from 'react';
import { useNavigate } from 'react-router';

import moderationApi, {
  type DuplicateCandidate,
  type ModerationEntry,
  type ModerationTarget,
} from '../../../services/api/moderation';

const RULE_LABELS: Record<DuplicateCandidate['rule'], string> = {
  exact_title: 'Exact normalized title',
  exact_content: 'Exact normalized content',
  near_title: 'Near title match',
};

interface DuplicateReviewPanelProps {
  entry: ModerationEntry;
  target: ModerationTarget;
}

const DuplicateReviewPanel: React.FC<DuplicateReviewPanelProps> = ({ entry, target }) => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = React.useState<DuplicateCandidate[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [merging, setMerging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const loadCandidates = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await moderationApi.listDuplicates(target);
        if (active) {
          setCandidates(response.candidates || []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to check duplicate candidates');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void loadCandidates();
    return () => {
      active = false;
    };
  }, [target]);

  const selected = candidates.find((candidate) => candidate.id === selectedId) || null;

  const handleMerge = async () => {
    if (!selected || !entry.objectType || !entry._id || reason.trim().length < 10) {
      return;
    }
    if (!window.confirm(`Merge this entry into "${selected.title}"? The source URL will redirect to the target.`)) {
      return;
    }

    try {
      setMerging(true);
      setError(null);
      const response = await moderationApi.mergeDuplicate({
        objectType: entry.objectType,
        sourceId: entry._id,
        targetId: selected.id,
        sourceEditDate: entry.editDate,
        targetEditDate: selected.editDate,
        reason: reason.trim(),
      });
      navigate(response.merge.target.path, { replace: true });
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : 'Unable to merge duplicate entries');
    } finally {
      setMerging(false);
    }
  };

  return (
    <section className="panel panel-default" aria-labelledby="duplicate-review-heading">
      <div className="panel-heading">
        <strong id="duplicate-review-heading">Duplicate Review</strong>
      </div>
      <div className="panel-body">
        <p className="text-muted">
          Candidates use the same entry type, parent scope, and visibility boundary. Merges always require a reason.
        </p>
        {loading ? <p className="text-muted">Checking candidates...</p> : null}
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {!loading && !error && candidates.length === 0 ? (
          <div className="alert alert-success">No deterministic duplicate candidates found.</div>
        ) : null}
        {candidates.length > 0 ? (
          <>
            <div className="list-group">
              {candidates.map((candidate) => (
                <label className="list-group-item" key={candidate.id}>
                  <input
                    type="radio"
                    name="duplicate-target"
                    value={candidate.id}
                    checked={selectedId === candidate.id}
                    onChange={() => setSelectedId(candidate.id)}
                    disabled={merging}
                  />{' '}
                  <strong>{candidate.title || 'Untitled entry'}</strong>
                  <br />
                  <span className="text-muted">
                    {RULE_LABELS[candidate.rule]} ({Math.round(candidate.score * 100)}%)
                  </span>
                </label>
              ))}
            </div>
            <div className="form-group">
              <label htmlFor="duplicate-merge-reason">Merge reason</label>
              <textarea
                id="duplicate-merge-reason"
                className="form-control"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                disabled={merging}
                placeholder="Explain why the selected target should survive."
              />
            </div>
            <button
              className="btn btn-danger"
              type="button"
              onClick={handleMerge}
              disabled={!selected || reason.trim().length < 10 || merging}
            >
              {merging ? 'Merging...' : 'Merge Into Selected Entry'}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default DuplicateReviewPanel;

