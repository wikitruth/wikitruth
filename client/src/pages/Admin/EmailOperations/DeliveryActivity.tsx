import React, { memo } from 'react';
import type { EmailDeliveryRecord } from '../../../services/api/emailOperations';

interface DeliveryActivityProps {
  deliveries: EmailDeliveryRecord[];
  retryingId: string;
  onRetry: (id: string) => Promise<void>;
}

const STATUS_STYLE: Record<string, string> = {
  delivered: 'success', queued: 'info', processing: 'primary', failed: 'danger', suppressed: 'warning',
};

const DeliveryActivity: React.FC<DeliveryActivityProps> = ({ deliveries, retryingId, onRetry }) => (
  <section className="panel panel-default wt-email-activity" aria-labelledby="email-activity-title">
    <div className="panel-heading"><strong id="email-activity-title">Recent delivery activity</strong></div>
    <div className="table-responsive wt-email-activity-table">
      <table className="table table-hover">
        <thead><tr><th>Template</th><th>Recipient</th><th>Status</th><th>Provider</th><th>Attempts</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {deliveries.length ? deliveries.map((delivery) => (
            <tr key={delivery.id}>
              <td><strong>{delivery.templateKey.replace(/_/g, ' ')}</strong>{delivery.test ? <span className="label label-default">test</span> : null}</td>
              <td>{delivery.recipientMasked}</td>
              <td><span className={`label label-${STATUS_STYLE[delivery.status] || 'default'}`}>{delivery.status}</span>{delivery.lastError ? <small title={delivery.lastError}>{delivery.errorCode || 'delivery error'}</small> : null}</td>
              <td>{delivery.providerName || 'Not assigned'}</td>
              <td>{delivery.attempts}/{delivery.maxAttempts}</td>
              <td>{new Date(delivery.createDate).toLocaleString()}</td>
              <td>{delivery.status === 'failed' ? <button type="button" className="btn btn-default btn-xs" onClick={() => void onRetry(delivery.id)} disabled={retryingId === delivery.id}>{retryingId === delivery.id ? 'Retrying…' : 'Retry'}</button> : null}</td>
            </tr>
          )) : <tr><td colSpan={7} className="text-muted">No email delivery attempts have been recorded.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="wt-email-activity-mobile">
      {deliveries.length ? deliveries.map((delivery) => (
        <article className="wt-email-delivery-card" key={delivery.id}>
          <div className="wt-email-delivery-card-heading">
            <strong>{delivery.templateKey.replace(/_/g, ' ')}</strong>
            <span className={`label label-${STATUS_STYLE[delivery.status] || 'default'}`}>{delivery.status}</span>
          </div>
          <dl>
            <div><dt>Recipient</dt><dd>{delivery.recipientMasked}</dd></div>
            <div><dt>Provider</dt><dd>{delivery.providerName || 'Not assigned'}</dd></div>
            <div><dt>Attempts</dt><dd>{delivery.attempts}/{delivery.maxAttempts}</dd></div>
            <div><dt>Created</dt><dd>{new Date(delivery.createDate).toLocaleString()}</dd></div>
          </dl>
          {delivery.lastError ? <p className="text-danger" title={delivery.lastError}>{delivery.errorCode || 'Delivery error'}</p> : null}
          <div className="wt-email-delivery-card-footer">
            {delivery.test ? <span className="label label-default">test</span> : <span />}
            {delivery.status === 'failed' ? <button type="button" className="btn btn-default btn-sm" onClick={() => void onRetry(delivery.id)} disabled={retryingId === delivery.id}>{retryingId === delivery.id ? 'Retrying…' : 'Retry'}</button> : null}
          </div>
        </article>
      )) : <p className="wt-email-delivery-empty text-muted">No email delivery attempts have been recorded.</p>}
    </div>
  </section>
);

export default memo(DeliveryActivity);
