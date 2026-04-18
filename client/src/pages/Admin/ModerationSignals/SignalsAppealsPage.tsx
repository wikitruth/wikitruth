import React, { useEffect, useMemo, useState } from 'react';
import Alert from '../../../components/common/Alert';
import PageMeta from '../../../components/common/PageMeta';
import moderationApi from '../../../services/api/moderation';

type QueueTab = 'signals' | 'appeals';

const SignalsAppealsPage: React.FC = () => {
  const [tab, setTab] = useState<QueueTab>('signals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signals, setSignals] = useState<Array<Record<string, unknown>>>([]);
  const [appeals, setAppeals] = useState<Array<Record<string, unknown>>>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [signalsResult, appealsResult] = await Promise.all([
        moderationApi.listReaderSignals(),
        moderationApi.listAppeals(),
      ]);
      setSignals(Array.isArray(signalsResult.signals) ? signalsResult.signals : []);
      setAppeals(Array.isArray(appealsResult.appeals) ? appealsResult.appeals : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load moderation queues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => (tab === 'signals' ? signals : appeals), [tab, signals, appeals]);

  const updateStatus = async (id: string, status: string) => {
    try {
      if (tab === 'signals') {
        await moderationApi.updateReaderSignal(id, { status });
      } else {
        await moderationApi.updateAppeal(id, { status });
      }
      await load();
    } catch (_error) {
      setError(`Unable to update ${tab.slice(0, -1)} status.`);
    }
  };

  return (
    <div className="container">
      <PageMeta title="Reader Signals and Appeals" description="Moderation triage queue for reader signals and appeals." />
      <h2>Reader Signals and Appeals</h2>
      <p className="text-muted">Triage reader feedback queues without mutating entries automatically.</p>

      {error ? <Alert type="danger">{error}</Alert> : null}
      {loading ? <p className="text-muted">Loading moderation queues...</p> : null}

      <div className="btn-group" role="group" style={{ marginBottom: 12 }}>
        <button type="button" className={`btn btn-default ${tab === 'signals' ? 'active' : ''}`} onClick={() => setTab('signals')}>
          Signals ({signals.length})
        </button>
        <button type="button" className={`btn btn-default ${tab === 'appeals' ? 'active' : ''}`} onClick={() => setTab('appeals')}>
          Appeals ({appeals.length})
        </button>
      </div>{' '}
      <button type="button" className="btn btn-default btn-sm" onClick={() => void load()} disabled={loading}>
        <i className="fa fa-refresh" aria-hidden="true"></i> Refresh
      </button>

      {!loading && rows.length === 0 ? <Alert type="info">No {tab} found.</Alert> : null}

      {rows.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-condensed">
            <thead>
              <tr>
                <th>Time</th>
                <th>Target</th>
                <th>Type</th>
                <th>Status</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row._id || '');
                const status = String(row.status || '');
                const note = String(row.note || '');
                const objectName = String(row.objectName || '');
                const objectId = String(row.objectId || '');
                const typeLabel = tab === 'signals' ? String(row.signalType || '-') : String(row.reasonType || '-');
                return (
                  <tr key={id}>
                    <td>{row.createDate ? new Date(String(row.createDate)).toLocaleString() : ''}</td>
                    <td>
                      <span>{objectName || '-'}</span>
                      <br />
                      <small className="text-muted">{objectId || '-'}</small>
                    </td>
                    <td>{typeLabel}</td>
                    <td>{status || '-'}</td>
                    <td style={{ maxWidth: 320 }}>{note || '-'}</td>
                    <td>
                      <div className="btn-group btn-group-xs">
                        <button type="button" className="btn btn-default" onClick={() => void updateStatus(id, 'in_review')}>
                          In Review
                        </button>
                        <button type="button" className="btn btn-success" onClick={() => void updateStatus(id, 'resolved')}>
                          Resolve
                        </button>
                        <button type="button" className="btn btn-warning" onClick={() => void updateStatus(id, 'dismissed')}>
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default SignalsAppealsPage;
