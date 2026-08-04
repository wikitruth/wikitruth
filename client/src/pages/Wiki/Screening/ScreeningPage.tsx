import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import moderationApi, { type ModerationEntry, type ModerationStatusOption, type ModerationTarget } from '../../../services/api/moderation';
import { useAuth } from '../../../context/AuthContext';
import DuplicateReviewPanel from './DuplicateReviewPanel';

const TARGET_KEYS = ['topic', 'topicLink', 'argument', 'argumentLink', 'artifact', 'question', 'answer', 'issue', 'opinion'] as const;

function getTargetFromSearch(search: string): ModerationTarget | null {
  const params = new URLSearchParams(search);
  for (const key of TARGET_KEYS) {
    const id = (params.get(key) || '').trim();
    if (id) {
      return { key, id };
    }
  }
  return null;
}

const ScreeningPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [entry, setEntry] = React.useState<ModerationEntry | null>(null);
  const [statuses, setStatuses] = React.useState<ModerationStatusOption[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const target = React.useMemo(() => getTargetFromSearch(location.search), [location.search]);
  const canModerate = Boolean(user?.roles?.screener || user?.roles?.reviewer || user?.roles?.admin);
  const canScreen = Boolean(user?.roles?.screener || user?.roles?.admin);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!target) {
        setError('Missing moderation target');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await moderationApi.entry(target);
        setEntry(result.entry || null);
        const nextStatuses = result.screeningStatuses || [];
        setStatuses(nextStatuses);
        const currentStatus =
          typeof result.entry?.screening?.status === 'number'
            ? result.entry.screening.status
            : nextStatuses[0]?.code || 0;
        setSelectedStatus(currentStatus);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load entry for screening');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthLoading) {
      return;
    }

    if (!canModerate) {
      setError('Screener or admin privileges are required');
      setIsLoading(false);
      return;
    }

    void fetchData();
  }, [canModerate, isAuthLoading, target]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      const result = await moderationApi.updateScreening(target, selectedStatus);
      if (result.entry) {
        setEntry(result.entry);
      }
      setMessage('Screening status updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update screening');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container">
      <h2>Screening</h2>
      <p className="text-muted">Update moderation screening status without leaving the modern client.</p>

      {isLoading ? <p className="text-muted">Loading...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!isLoading && !error && target && entry ? (
        <form className="panel panel-default" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <strong>{entry.title || 'Untitled entry'}</strong>
          </div>
          <div className="panel-body">
            <p className="text-muted">
              Target: <code>{target.key}</code> / <code>{target.id}</code>
            </p>
            <div className="form-group">
              <label htmlFor="screening-status">Screening status</label>
              <select
                id="screening-status"
                className="form-control"
                value={String(selectedStatus)}
                onChange={(event) => setSelectedStatus(Number(event.target.value))}
                disabled={!canScreen}
              >
                {statuses.map((status) => (
                  <option key={status.code} value={String(status.code)}>
                    {status.text}
                  </option>
                ))}
              </select>
            </div>
            {message ? <div className="alert alert-success">{message}</div> : null}
            {!canScreen ? (
              <p className="text-muted">Reviewer access can evaluate duplicates; screening status requires screener or admin access.</p>
            ) : null}
            <button className="btn btn-primary" type="submit" disabled={isSaving || !canScreen}>
              {isSaving ? 'Saving...' : 'Save Screening Status'}
            </button>{' '}
            <button className="btn btn-default" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {!isLoading && !error && target && entry ? <DuplicateReviewPanel entry={entry} target={target} /> : null}
    </div>
  );
};

export default ScreeningPage;
