import React, { useEffect, useState } from 'react';
import Alert from '../../../components/common/Alert';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { adminApi } from '../../../services/api/admin';

const DBBackupPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ backupDir: string; privateBackupDir: string; hasGitBackup: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restorePublicData, setRestorePublicData] = useState(true);
  const [restorePrivateData, setRestorePrivateData] = useState(true);
  const [confirmText, setConfirmText] = useState('');

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminApi.dbBackupStatus();
      setStatus(result.backup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backup status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleRunBackup = async () => {
    try {
      setRunning(true);
      setError(null);
      setMessage(null);
      const result = await adminApi.runDbBackup();
      const documentCount = [...Object.values(result.backup.summary.public), ...Object.values(result.backup.summary.private)]
        .reduce((total, count) => total + count, 0);
      setMessage(
        `${result.message}: ${documentCount.toLocaleString()} documents at ${new Date(result.backup.completedAt).toLocaleString()}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start backup');
    } finally {
      setRunning(false);
    }
  };

  const handleRestore = async () => {
    if (confirmText.trim().toUpperCase() !== 'RESTORE') {
      setError('Type RESTORE in the confirmation box before restoring.');
      return;
    }

    if (!window.confirm('Run restore now? This overwrites persisted data in selected scopes.')) {
      return;
    }

    try {
      setRunning(true);
      setError(null);
      setMessage(null);
      const result = await adminApi.runDbRestore({
        restorePublicData,
        restorePrivateData,
        confirmText,
      });
      setMessage(`${result.message}. Completed at ${new Date(result.restore.completedAt).toLocaleString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run restore');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading backup configuration..." />;
  }

  return (
    <div className="container">
      <h2>Database Backup</h2>
      <p className="text-muted">Run operational backup from the modern admin client.</p>

      {error && <Alert type="danger">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {status && (
        <div className="panel panel-default">
          <div className="panel-body">
            <p>
              <strong>Public backup directory:</strong>{' '}
              <code className="wt-code-wrap">{status.backupDir}</code>
            </p>
            <p>
              <strong>Private backup directory:</strong>{' '}
              <code className="wt-code-wrap">{status.privateBackupDir}</code>
            </p>
            <p>
              <strong>Git backup configured:</strong> {status.hasGitBackup ? 'Yes' : 'No'}
            </p>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button type="button" variant="primary" onClick={handleRunBackup} disabled={running} icon={running ? 'spinner fa-spin' : 'database'}>
                {running ? 'Running Backup...' : 'Run Backup'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={loadStatus} disabled={running} icon="refresh">
                Refresh Status
              </Button>
            </div>

            <hr />
            <h4 style={{ marginTop: 10 }}>Restore</h4>
            <p className="text-warning">
              Restore overwrites existing records in selected scopes based on backup files.
            </p>
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={restorePublicData}
                  onChange={(event) => setRestorePublicData(event.target.checked)}
                  disabled={running}
                />{' '}
                Restore public data
              </label>
            </div>
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={restorePrivateData}
                  onChange={(event) => setRestorePrivateData(event.target.checked)}
                  disabled={running}
                />{' '}
                Restore private user data
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="restore-confirm">Type RESTORE to confirm</label>
              <input
                id="restore-confirm"
                className="form-control"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="RESTORE"
                disabled={running}
              />
            </div>
            <Button
              type="button"
              variant="danger"
              onClick={handleRestore}
              disabled={running || !restorePublicData && !restorePrivateData}
              icon={running ? 'spinner fa-spin' : 'history'}
            >
              {running ? 'Running Restore...' : 'Run Restore'}
            </Button>
          </div>
        </div>
      )}

      <Alert type="info">
        Legacy backup route remains available for comparison: <a href="/admin/db-backup" target="_blank" rel="noopener noreferrer">/admin/db-backup</a>
      </Alert>
    </div>
  );
};

export default DBBackupPage;
