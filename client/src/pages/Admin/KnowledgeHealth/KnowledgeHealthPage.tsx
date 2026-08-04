import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import PageMeta from '../../../components/common/PageMeta';
import {
  completeKnowledgeReviewTask,
  getKnowledgeHealth,
  type KnowledgeHealth,
  type KnowledgeHealthQueueKey,
} from '../../../services/api/epistemic';

const FILTERS: Array<{ key: '' | KnowledgeHealthQueueKey; label: string }> = [
  { key: '', label: 'All queues' },
  { key: 'evidence_gaps', label: 'Evidence gaps' },
  { key: 'critical_issues', label: 'Critical issues' },
  { key: 'quorum_gaps', label: 'Quorum gaps' },
  { key: 'revalidation', label: 'Revalidation' },
  { key: 'source_failures', label: 'Source failures' },
  { key: 'stale_sources', label: 'Stale sources' },
  { key: 'duplicates', label: 'Duplicates' },
  { key: 'unanswered_questions', label: 'Unanswered questions' },
];

function formatDate(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString();
}

const KnowledgeHealthPage: React.FC = () => {
  const [health, setHealth] = useState<KnowledgeHealth | null>(null);
  const [filter, setFilter] = useState<'' | KnowledgeHealthQueueKey>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setHealth(await getKnowledgeHealth(filter || undefined));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load knowledge health');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const visibleTotal = useMemo(
    () => health?.queues.reduce((sum, queue) => sum + queue.count, 0) || 0,
    [health],
  );

  const updateTask = async (taskId: string, status: 'completed' | 'dismissed') => {
    setUpdatingTaskId(taskId);
    setError('');
    try {
      await completeKnowledgeReviewTask(taskId, status);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update review task');
    } finally {
      setUpdatingTaskId('');
    }
  };

  return (
    <div className="container">
      <PageMeta title="Knowledge Health" description="Operational queues for evidence, review, source, and coverage gaps." />
      <div className="page-header">
        <h1><i className="fa fa-heartbeat text-danger" aria-hidden="true"></i> Knowledge Health</h1>
        <p className="text-muted">Actionable maintenance queues. These signals prioritize review; they never determine truth.</p>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="col-sm-4">
          <label htmlFor="knowledge-health-filter">Queue</label>
          <select
            id="knowledge-health-filter"
            className="form-control"
            value={filter}
            onChange={(event) => setFilter(event.target.value as '' | KnowledgeHealthQueueKey)}
          >
            {FILTERS.map((option) => <option key={option.key || 'all'} value={option.key}>{option.label}</option>)}
          </select>
        </div>
        <div className="col-sm-8 text-right" style={{ paddingTop: 25 }}>
          <strong>{visibleTotal}</strong> open item{visibleTotal === 1 ? '' : 's'}{' '}
          <button type="button" className="btn btn-default btn-sm" onClick={() => void load()} disabled={loading}>
            <i className="fa fa-refresh" aria-hidden="true"></i> Refresh
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {loading ? <p className="text-muted" role="status">Loading knowledge health...</p> : null}

      {!loading && health?.queues.map((queue) => (
        <section className="panel panel-default" key={queue.key}>
          <div className="panel-heading">
            <strong>{queue.label}</strong>{' '}
            <span className={`label ${queue.count ? 'label-warning' : 'label-success'}`}>{queue.count}</span>
          </div>
          <div className="panel-body">
            {queue.items.length === 0 ? <p className="text-success" style={{ marginBottom: 0 }}>No open items.</p> : (
              <div className="list-group" style={{ marginBottom: 0 }}>
                {queue.items.map((item) => (
                  <div className="list-group-item" key={`${queue.key}-${item.id}`}>
                    <div className="row">
                      <div className="col-sm-8">
                        <Link to={item.path}><strong>{item.title}</strong></Link>{' '}
                        <span className="label label-default">{item.objectName}</span>
                        {item.priority && item.priority !== 'normal' ? <span className="label label-danger" style={{ marginLeft: 4 }}>{item.priority}</span> : null}
                        <p className="text-muted" style={{ margin: '5px 0 0' }}>{item.reason}</p>
                        {item.dueAt || item.editDate ? (
                          <small className="text-muted">{item.dueAt ? 'Due' : 'Updated'}: {formatDate(item.dueAt || item.editDate)}</small>
                        ) : null}
                      </div>
                      {item.taskId ? (
                        <div className="col-sm-4 text-right">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={updatingTaskId === item.taskId}
                            onClick={() => void updateTask(item.taskId as string, 'completed')}
                          >Complete</button>{' '}
                          <button
                            type="button"
                            className="btn btn-default btn-sm"
                            disabled={updatingTaskId === item.taskId}
                            onClick={() => void updateTask(item.taskId as string, 'dismissed')}
                          >Dismiss</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};

export default KnowledgeHealthPage;
