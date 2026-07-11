import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import PageMeta from '../../components/common/PageMeta';
import Input from '../../components/Form/Input';
import LoadingSpinner from '../../components/LoadingSpinner';
import apiService from '../../services/api';
import type { InstallStatusResponse } from '../../types/api';

const InstallPage: React.FC = () => {
  const [status, setStatus] = useState<InstallStatusResponse['install'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void apiService.getInstallStatus()
      .then((result) => {
        if (mounted) setStatus(result.install || null);
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load installation status.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRestore = async (event: React.FormEvent) => {
    event.preventDefault();
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiService.restoreEmptyDatabase({ bootstrapToken, confirmText });
      setMessage(result.message || 'Bootstrap restore completed.');
      setStatus((current) => current ? { ...current, initialized: true, databaseEmpty: false, eligible: false, hasAdmin: true } : current);
      setBootstrapToken('');
      setConfirmText('');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Bootstrap restore failed.');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Checking installation status..." />;
  }

  return (
    <div className="container">
      <PageMeta title="Install" description="Initialize Wikitruth from a server-managed backup" />
      <h1 className="page-header wt-header">Install Wikitruth</h1>

      {error ? <Alert type="danger">{error}</Alert> : null}
      {message ? (
        <Alert type="success">
          {message} <Link to="/login">Sign in</Link> with a restored administrator account.
        </Alert>
      ) : null}

      {status?.initialized ? (
        <Alert type="info">
          This database is already initialized.{' '}
          {status.adminRestorePath ? (
            <Link to={status.adminRestorePath}>Use the administrator backup and restore page.</Link>
          ) : (
            <Link to="/login">Sign in as an administrator to continue.</Link>
          )}
        </Alert>
      ) : null}

      {status?.databaseEmpty && !status.tokenConfigured ? (
        <Alert type="warning">
          Bootstrap restore is disabled. Configure <code>WIKITRUTH_INSTALL_TOKEN</code> with at least
          16 random characters, then restart the application.
        </Alert>
      ) : null}

      {status?.databaseEmpty && !status.backupReady ? (
        <Alert type="danger">
          The server backup is incomplete. Required collections: {status.requiredCollections.join(', ')}.
          {status.missingCollections.length > 0
            ? ` Missing: ${status.missingCollections.join(', ')}.`
            : ''}
        </Alert>
      ) : null}

      {status?.eligible && !message ? (
        <div className="panel panel-warning">
          <div className="panel-heading">
            <strong>One-time empty-database restore</strong>
          </div>
          <div className="panel-body">
            <p>
              This operation restores the server-managed public and private backups. It becomes unavailable
              as soon as administrator, user, or topic data exists.
            </p>
            <form onSubmit={handleRestore}>
              <Input
                name="bootstrapToken"
                type="password"
                label="Bootstrap token"
                value={bootstrapToken}
                onChange={(event) => setBootstrapToken(event.target.value)}
                autoComplete="off"
                required
              />
              <Input
                name="confirmText"
                label="Type RESTORE to confirm"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoComplete="off"
                required
              />
              <Button
                type="submit"
                variant="danger"
                icon="database"
                disabled={running || !bootstrapToken || confirmText.trim().toUpperCase() !== 'RESTORE'}
              >
                {running ? 'Restoring...' : 'Restore Empty Database'}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default InstallPage;
