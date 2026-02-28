import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import moderationApi, { type ModerationEntry, type ModerationStatusOption, type ModerationTarget } from '../../../services/api/moderation';
import { useAuth } from '../../../context/AuthContext';

const TARGET_KEYS = ['topic', 'argument'] as const;

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

const ConvertPage: React.FC = () => {
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
  const canModerate = Boolean(user?.roles?.admin);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!target) {
        setError('Missing convert target');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await moderationApi.entry(target);
        setEntry(result.entry || null);
        const nextStatuses = result.verdictStatuses || [];
        setStatuses(nextStatuses);
        const currentStatus =
          typeof result.entry?.verdict?.status === 'number'
            ? result.entry.verdict.status
            : nextStatuses[0]?.code || 0;
        setSelectedStatus(currentStatus);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load entry for convert');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthLoading) {
      return;
    }

    if (!canModerate) {
      setError('Admin privileges are required');
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
      const result = await moderationApi.updateVerdict(target, selectedStatus);
      if (result.entry) {
        setEntry(result.entry);
      }
      setMessage('Verdict updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to convert entry');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container">
      <h2>Convert</h2>
      <p className="text-muted">Update verdict status in the modern moderation workflow.</p>

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
              <label htmlFor="verdict-status">Verdict status</label>
              <select
                id="verdict-status"
                className="form-control"
                value={String(selectedStatus)}
                onChange={(event) => setSelectedStatus(Number(event.target.value))}
              >
                {statuses.map((status) => (
                  <option key={status.code} value={String(status.code)}>
                    {status.text}
                  </option>
                ))}
              </select>
            </div>
            {message ? <div className="alert alert-success">{message}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Verdict'}
            </button>{' '}
            <button className="btn btn-default" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
};

export default ConvertPage;
