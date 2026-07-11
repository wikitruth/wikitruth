import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import Alert from '../components/common/Alert';
import timelineApi, { type TimelineEvent } from '../services/api/timeline';
import type { EntryRevision } from '../services/api/timeline';
import moderationApi, { type ModerationTargetKey } from '../services/api/moderation';
import ChangeRequestPanel from '../components/Entry/ChangeRequestPanel';
import { useAuth } from '../context/AuthContext';

function useQueryParams(): URLSearchParams {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

const EntryTimelinePage: React.FC = () => {
  const query = useQueryParams();
  const objectName = String(query.get('objectName') || '').trim();
  const objectId = String(query.get('id') || query.get('objectId') || '').trim();
  const objectType = Number(query.get('objectType') || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [buckets, setBuckets] = useState<Array<{ day: string; count: number }>>([]);
  const [revisions, setRevisions] = useState<EntryRevision[]>([]);
  const [rollbackRevisionId, setRollbackRevisionId] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollingBack, setRollingBack] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!objectName || !objectId) {
        setError('Timeline target is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [listResult, chartResult, revisionResult] = await Promise.all([
          timelineApi.list({
            objectName,
            objectType: Number.isFinite(objectType) && objectType > 0 ? objectType : undefined,
            id: objectId,
            limit: 100,
          }),
          timelineApi.visualization({
            objectName,
            objectType: Number.isFinite(objectType) && objectType > 0 ? objectType : undefined,
            id: objectId,
            days: 45,
          }),
          timelineApi.revisions({
            objectName,
            objectType: Number.isFinite(objectType) && objectType > 0 ? objectType : undefined,
            id: objectId,
            limit: 50,
          }),
        ]);
        setEvents(Array.isArray(listResult.events) ? listResult.events : []);
        setBuckets(Array.isArray(chartResult.buckets) ? chartResult.buckets : []);
        setRevisions(Array.isArray(revisionResult.revisions) ? revisionResult.revisions : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load timeline.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [objectName, objectId, objectType]);

  const normalizedObjectName = objectName || 'entry';
  const fallbackBackPath = `/${normalizedObjectName}s`;
  const canRollback = Boolean(user?.roles?.reviewer || user?.roles?.admin);
  const moderationTarget = objectName && objectId
    ? { key: objectName as ModerationTargetKey, id: objectId }
    : null;

  const rollback = async () => {
    if (!objectType || !objectId || !rollbackRevisionId || rollbackReason.trim().length < 10) {
      return;
    }
    try {
      setRollingBack(true);
      setError(null);
      await moderationApi.rollbackEntry({
        objectType,
        objectId,
        revisionId: rollbackRevisionId,
        reason: rollbackReason.trim(),
      });
      const result = await timelineApi.revisions({ objectName, objectType, id: objectId, limit: 50 });
      setRevisions(result.revisions || []);
      setRollbackRevisionId('');
      setRollbackReason('');
    } catch (rollbackError) {
      setError(rollbackError instanceof Error ? rollbackError.message : 'Unable to roll back revision');
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="container">
      <PageMeta title="Timeline" description="Entry timeline and activity history." />
      <h2>Timeline</h2>
      <p className="text-muted">
        Target: <code>{normalizedObjectName}</code> <code>{objectId || '-'}</code>
      </p>
      {error ? <Alert type="danger">{error}</Alert> : null}
      {loading ? <p className="text-muted">Loading timeline...</p> : null}

      {!loading && buckets.length > 0 ? (
        <div className="panel panel-default">
          <div className="panel-heading">
            <strong>Activity by Day</strong>
          </div>
          <div className="panel-body">
            <div className="row">
              {buckets.map((bucket) => (
                <div key={bucket.day} className="col-xs-6 col-sm-3 col-md-2" style={{ marginBottom: 8 }}>
                  <div className="well well-sm" style={{ marginBottom: 0 }}>
                    <div style={{ fontSize: 12 }}>{bucket.day}</div>
                    <strong>{bucket.count}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && revisions.length > 0 ? (
        <div className="panel panel-default">
          <div className="panel-heading"><strong>Revision History</strong></div>
          <div className="panel-body">
            <div className="list-group">
              {revisions.map((revision, index) => (
                <div className="list-group-item" key={revision._id}>
                  <div className="clearfix">
                    <strong>Revision {revision.revisionNumber}</strong>
                    <span className="pull-right text-muted">{revision.createDate ? new Date(revision.createDate).toLocaleString() : ''}</span>
                  </div>
                  <div>{revision.summary || revision.source}</div>
                  <small className="text-muted">
                    {revision.source}{revision.createUsername ? ` by ${revision.createUsername}` : ''}
                    {revision.changedFields.length ? `; changed: ${revision.changedFields.join(', ')}` : ''}
                  </small>
                  {canRollback && index > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      <button type="button" className="btn btn-warning btn-xs" onClick={() => setRollbackRevisionId(revision._id)}>
                        Select for Rollback
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {canRollback && rollbackRevisionId ? (
              <div className="well well-sm">
                <label htmlFor="rollback-reason">Rollback reason</label>
                <textarea id="rollback-reason" className="form-control" rows={3} value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} />
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-danger btn-sm" disabled={rollingBack || rollbackReason.trim().length < 10} onClick={() => void rollback()}>
                    {rollingBack ? 'Rolling Back...' : 'Create Rollback Revision'}
                  </button>{' '}
                  <button type="button" className="btn btn-default btn-sm" onClick={() => setRollbackRevisionId('')} disabled={rollingBack}>Cancel</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading && moderationTarget ? <ChangeRequestPanel target={moderationTarget} /> : null}

      {!loading && events.length === 0 ? <Alert type="info">No timeline events available.</Alert> : null}

      {events.length > 0 ? (
        <ul className="list-group">
          {events.map((event) => (
            <li key={String(event._id || `${event.eventType}-${event.createDate}`)} className="list-group-item">
              <div className="clearfix">
                <strong>{event.message || event.eventType || 'Timeline event'}</strong>
                <span className="pull-right text-muted">
                  {event.createDate ? new Date(event.createDate).toLocaleString() : ''}
                </span>
              </div>
              <div className="text-muted">
                <small>
                  <code>{event.eventType}</code>
                  {event.actorUsername ? ` by ${event.actorUsername}` : ''}
                </small>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Link to={fallbackBackPath} className="btn btn-default btn-sm">
        <i className="fa fa-arrow-left" aria-hidden="true"></i> Back
      </Link>
    </div>
  );
};

export default EntryTimelinePage;
