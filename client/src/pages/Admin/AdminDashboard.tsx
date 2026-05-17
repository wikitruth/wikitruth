import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/api/admin';
import { createRealtimeChannel } from '../../services/realtime';
import type { RealtimeConnectionState, RealtimeEvent } from '../../types/realtime';
import PageMeta from '../../components/common/PageMeta';

interface DashboardCounts {
  users?: number;
  accounts?: number;
  categories?: number;
  statuses?: number;
  administrators?: number;
  groups?: number;
}

const AdminDashboard: React.FC = () => {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        const data = (await adminApi.dashboard()) as { counts?: DashboardCounts };
        if (isMounted) {
          setCounts(data.counts || null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const channel = createRealtimeChannel({
      onStateChange: (state) => {
        setRealtimeState(state);
        if (state !== 'error') {
          setRealtimeError(null);
        }
      },
      onReconnectAttempt: (attempt) => {
        setReconnectAttempt(attempt);
      },
      onError: () => {
        setRealtimeError('Realtime connection interrupted. Reconnecting...');
      },
      onEvent: (event) => {
        setRecentEvents((previous) => [event, ...previous].slice(0, 5));
      },
    });

    channel.connect();

    return () => {
      channel.disconnect();
    };
  }, []);

  const realtimeLabelByState: Record<RealtimeConnectionState, string> = {
    connected: 'success',
    connecting: 'warning',
    error: 'danger',
    disconnected: 'default',
  };

  return (
    <div className="container">
      <PageMeta title="Admin Dashboard" />
      <h2>Admin Dashboard</h2>
      <p className="text-muted">Administrative controls and system overview.</p>

      <div className="panel panel-default">
        <div className="panel-heading">
          <strong>Realtime Status</strong>
        </div>
        <div className="panel-body">
          <p>
            Connection:{' '}
            <span className={`label label-${realtimeLabelByState[realtimeState]}`}>
              {realtimeState}
            </span>
            {reconnectAttempt > 0 && realtimeState !== 'connected' ? (
              <span className="text-muted"> (reconnect attempt #{reconnectAttempt})</span>
            ) : null}
          </p>
          {realtimeError ? <p className="text-danger">{realtimeError}</p> : null}
          {recentEvents.length > 0 ? (
            <div>
              <p className="text-muted" style={{ marginBottom: 6 }}>
                Recent events
              </p>
              <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                {recentEvents.map((event, index) => (
                  <li key={`${event.timestamp}-${event.type}-${index}`}>
                    <code>{event.type}</code> at{' '}
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted">Waiting for events...</p>
          )}
        </div>
      </div>

      {isLoading ? <p className="text-muted">Loading dashboard...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!isLoading && !error && counts ? (
        <div className="row">
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Users</div>
              <div className="panel-body">
                <strong>{counts.users || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Accounts</div>
              <div className="panel-body">
                <strong>{counts.accounts || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Categories</div>
              <div className="panel-body">
                <strong>{counts.categories || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Statuses</div>
              <div className="panel-body">
                <strong>{counts.statuses || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Administrators</div>
              <div className="panel-body">
                <strong>{counts.administrators || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Groups</div>
              <div className="panel-body">
                <strong>{counts.groups || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-warning">
              <div className="panel-heading">Verdict Queue</div>
              <div className="panel-body">
                <p className="text-muted" style={{ marginBottom: 10 }}>
                  Review pending verdict updates.
                </p>
                <Link to="/admin/verdicts" className="btn btn-warning btn-xs">
                  Open Queue
                </Link>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-info">
              <div className="panel-heading">Signals & Appeals</div>
              <div className="panel-body">
                <p className="text-muted" style={{ marginBottom: 10 }}>
                  Triage reader signals and appeal requests.
                </p>
                <Link to="/admin/moderation/signals" className="btn btn-info btn-xs">
                  Open Triage
                </Link>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Privileged Audit</div>
              <div className="panel-body">
                <p className="text-muted" style={{ marginBottom: 10 }}>
                  Review immutable privileged action timeline.
                </p>
                <Link to="/admin/audit" className="btn btn-default btn-xs">
                  View Timeline
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
