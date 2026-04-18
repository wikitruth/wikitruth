import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import Alert from '../components/common/Alert';
import timelineApi, { type TimelineEvent } from '../services/api/timeline';

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
        const [listResult, chartResult] = await Promise.all([
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
        ]);
        setEvents(Array.isArray(listResult.events) ? listResult.events : []);
        setBuckets(Array.isArray(chartResult.buckets) ? chartResult.buckets : []);
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
