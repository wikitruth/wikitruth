import React, { useEffect, useState } from 'react';
import Alert from '../common/Alert';
import Button from '../common/Button';
import LoadingSpinner from '../LoadingSpinner';
import authApi, { type WebSessionSummary } from '../../services/api/auth';

function friendlyDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : value;
}

function methodLabel(value: string): string {
  const labels: Record<string, string> = {
    email_code: 'Email code',
    passkey: 'Passkey',
    password: 'Password',
    recovery_code: 'Recovery code',
    fast_switch: 'Fast switch',
    handoff: 'Tenant handoff',
    oauth: 'Connected account',
  };
  return labels[value] || value;
}

const SessionSecurityPanel: React.FC = () => {
  const [sessions, setSessions] = useState<WebSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const result = await authApi.sessions();
      setSessions(result.sessions || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load active sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const revoke = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await authApi.revokeSession(id);
      setMessage('Session revoked.');
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke the session.');
    } finally {
      setBusyId('');
    }
  };

  const revokeOthers = async () => {
    setBusyId('others');
    setError(null);
    try {
      const result = await authApi.revokeOtherSessions();
      setMessage(result.revoked === 1 ? 'One other session revoked.' : `${result.revoked} other sessions revoked.`);
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke other sessions.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="panel panel-default" id="sessions">
      <div className="panel-heading">
        <h3 className="panel-title"><i className="fa fa-laptop" aria-hidden="true" /> Active Sessions</h3>
      </div>
      <div className="panel-body">
        <p className="text-muted">Review browsers signed in to your account. Revoked sessions are rejected on their next request.</p>
        {error ? <Alert type="danger">{error}</Alert> : null}
        {message ? <Alert type="success" dismissible onDismiss={() => setMessage(null)}>{message}</Alert> : null}
        {loading ? <LoadingSpinner message="Loading active sessions..." /> : (
          <div className="list-group">
            {sessions.map(session => (
              <div className="list-group-item" key={session.id}>
                <div className="clearfix">
                  <strong>{session.device}</strong>{' '}
                  {session.current ? <span className="label label-success">Current session</span> : null}{' '}
                  {session.remembered ? <span className="label label-info">Remembered</span> : null}
                  {!session.current ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="pull-right"
                      disabled={busyId === session.id}
                      onClick={() => void revoke(session.id)}
                    >
                      {busyId === session.id ? 'Revoking...' : 'Revoke'}
                    </Button>
                  ) : null}
                </div>
                <div className="text-muted small" style={{ marginTop: 6 }}>
                  {methodLabel(session.authenticationMethod)} · IP {session.ipAddress || 'not recorded'} · Last active {friendlyDate(session.lastActivityAt)}
                </div>
                <div className="text-muted small">Expires {friendlyDate(session.expiresAt)}</div>
              </div>
            ))}
            {sessions.length === 0 ? <p className="text-muted">No active browser sessions were found.</p> : null}
          </div>
        )}
        <Button
          type="button"
          variant="warning"
          disabled={busyId === 'others' || sessions.filter(session => !session.current).length === 0}
          onClick={() => void revokeOthers()}
          icon="ban"
        >
          {busyId === 'others' ? 'Revoking...' : 'Revoke all other sessions'}
        </Button>
      </div>
    </div>
  );
};

export default SessionSecurityPanel;
