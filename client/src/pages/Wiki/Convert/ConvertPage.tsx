import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import moderationApi, { type ModerationEntry, type ModerationTarget } from '../../../services/api/moderation';
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
  const [targetType, setTargetType] = React.useState<'topic' | 'argument'>('argument');
  const [archiveSource, setArchiveSource] = React.useState(true);
  const [reason, setReason] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [destinationPath, setDestinationPath] = React.useState<string | null>(null);
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
        if (target.key === 'topic') {
          setTargetType('argument');
        } else {
          setTargetType('topic');
        }
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
      setDestinationPath(null);
      const result = await moderationApi.convertEntryType(target, {
        targetType,
        archiveSource,
        reason: reason.trim() || undefined,
      });
      if (result.destination?.entry) {
        setEntry(result.destination.entry);
      }
      if (result.destination?.path) {
        setDestinationPath(result.destination.path);
      }
      const destinationLabel = targetType === 'argument' ? 'Fact' : 'Topic';
      setMessage(`Entry converted to ${destinationLabel}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to convert entry');
    } finally {
      setIsSaving(false);
    }
  };

  const currentType = target?.key === 'argument' ? 'argument' : 'topic';
  const currentTypeLabel = currentType === 'topic' ? 'Topic' : 'Fact';

  return (
    <div className="container">
      <h2>Convert</h2>
      <p className="text-muted">Convert between Topic and Fact while preserving conversion history metadata.</p>

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
            <p className="text-muted">
              Current type: <strong>{currentTypeLabel}</strong>
            </p>
            <div className="form-group">
              <label htmlFor="target-type">Convert to</label>
              <select
                id="target-type"
                className="form-control"
                value={targetType}
                onChange={(event) => setTargetType(event.target.value === 'topic' ? 'topic' : 'argument')}
              >
                <option value="topic" disabled={currentType === 'topic'}>
                  Topic
                </option>
                <option value="argument" disabled={currentType === 'argument'}>
                  Fact
                </option>
              </select>
            </div>
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={archiveSource}
                  onChange={(event) => setArchiveSource(event.target.checked)}
                />{' '}
                Archive source entry after conversion
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="conversion-reason">Reason (optional)</label>
              <textarea
                id="conversion-reason"
                className="form-control"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why this conversion is needed"
              />
            </div>
            {message ? <div className="alert alert-success">{message}</div> : null}
            {destinationPath ? (
              <div className="alert alert-info">
                Converted entry path: <a href={destinationPath}>{destinationPath}</a>
              </div>
            ) : null}
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Converting...' : 'Convert Entry'}
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
