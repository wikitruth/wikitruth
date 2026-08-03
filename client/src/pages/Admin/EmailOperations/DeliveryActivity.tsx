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
    <div className="table-responsive">
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
  </section>
);

export default memo(DeliveryActivity);
