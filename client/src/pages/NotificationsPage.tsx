import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Alert from '../components/common/Alert';
import PageMeta from '../components/common/PageMeta';
import notificationsApi, { type NotificationDelivery, type NotificationRecord } from '../services/api/notifications';

const NotificationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [result, deliveryResult] = await Promise.all([
        notificationsApi.list({ limit: 100 }), notificationsApi.outbox({ limit: 20 }),
      ]);
      setItems(Array.isArray(result.notifications) ? result.notifications : []);
      setUnreadCount(Number(result.unreadCount || 0));
      setDeliveries(deliveryResult.deliveries || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationsApi.markRead(notificationId);
      setItems((prev) =>
        prev.map((item) =>
          String(item._id) === String(notificationId)
            ? {
                ...item,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (_error) {
      setError('Unable to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (_error) {
      setError('Unable to mark notifications as read.');
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      const result = await notificationsApi.retryDelivery(deliveryId);
      setDeliveries((previous) => previous.map((delivery) => delivery._id === deliveryId ? result.delivery : delivery));
    } catch (_error) {
      setError('Unable to retry notification delivery.');
    }
  };

  return (
    <div className="container">
      <PageMeta title="Notifications" description="Your follow and moderation notifications." />
      <h2>Notifications</h2>
      <p className="text-muted">Unread: {unreadCount}</p>
      <p><Link to="/account/settings"><i className="fa fa-cog" aria-hidden="true"></i> Delivery preferences</Link></p>

      {error ? <Alert type="danger">{error}</Alert> : null}
      {loading ? <p className="text-muted">Loading notifications...</p> : null}

      <div style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-default btn-sm" onClick={() => void load()} disabled={loading}>
          <i className="fa fa-refresh" aria-hidden="true"></i> Refresh
        </button>{' '}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => void handleMarkAllRead()}
          disabled={loading || unreadCount === 0}
        >
          <i className="fa fa-check-square-o" aria-hidden="true"></i> Mark All Read
        </button>
      </div>

      {!loading && items.length === 0 ? <Alert type="info">No notifications yet.</Alert> : null}

      {items.length > 0 ? (
        <div className="list-group">
          {items.map((item) => {
            const isUnread = !item.readAt;
            return (
              <div key={item._id} className={`list-group-item${isUnread ? ' list-group-item-warning' : ''}`}>
                <div className="clearfix">
                  <strong>{item.title || '(Untitled notification)'}</strong>
                  <span className="pull-right text-muted">
                    {item.createDate ? new Date(item.createDate).toLocaleString() : ''}
                  </span>
                </div>
                {item.body ? <p style={{ marginTop: 8, marginBottom: 8 }}>{item.body}</p> : null}
                <div>
                  {item.link ? (
                    <Link to={item.link} className="btn btn-link btn-sm" style={{ paddingLeft: 0 }}>
                      Open
                    </Link>
                  ) : null}
                  {isUnread ? (
                    <button
                      type="button"
                      className="btn btn-link btn-sm"
                      onClick={() => void handleMarkRead(String(item._id))}
                    >
                      Mark Read
                    </button>
                  ) : (
                    <span className="text-muted">
                      <i className="fa fa-check" aria-hidden="true"></i> Read
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="panel panel-default">
        <div className="panel-heading"><strong>Recent Delivery Status</strong></div>
        <div className="panel-body">
          <p className="text-muted">In-app delivery is immediate. Email digest and web push remain queued until their configured adapter confirms delivery.</p>
          {deliveries.length === 0 ? <p>No delivery records yet.</p> : (
            <div className="table-responsive">
              <table className="table table-condensed">
                <thead><tr><th>Channel</th><th>Status</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <tr key={delivery._id}>
                      <td>{delivery.channel.replace('_', ' ')}</td>
                      <td><span className={`label label-${delivery.status === 'delivered' ? 'success' : delivery.status === 'failed' ? 'danger' : delivery.status === 'queued' ? 'warning' : 'default'}`}>{delivery.status}</span></td>
                      <td>{delivery.createDate ? new Date(delivery.createDate).toLocaleString() : ''}</td>
                      <td className="text-right">{delivery.status === 'failed' ? <button type="button" className="btn btn-default btn-xs" onClick={() => void handleRetryDelivery(delivery._id)}>Retry</button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
