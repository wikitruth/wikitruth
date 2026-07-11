import React, { useEffect, useState } from 'react';
import Alert from '../../../components/common/Alert';
import PageMeta from '../../../components/common/PageMeta';
import adminApi from '../../../services/api/admin';

type AuditEvent = {
  _id?: string;
  eventType?: string;
  objectType?: number;
  objectName?: string;
  objectId?: string;
  actorUsername?: string;
  message?: string;
  createDate?: string;
  payload?: Record<string, unknown>;
  chainSequence?: number;
  eventHash?: string;
};

type AuditVerification = {
  valid: boolean;
  verifiedEvents: number;
  legacyEvents: number;
  headSequence: number;
  headHash: string;
  brokenAtSequence: number | null;
  reason: string | null;
};

const AuditTimelinePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [verification, setVerification] = useState<AuditVerification | null>(null);
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminApi.listAuditEvents({ limit: 200 });
      setEvents(Array.isArray(result.events) ? (result.events as AuditEvent[]) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const verify = async () => {
    try {
      setVerifying(true);
      setError(null);
      const result = await adminApi.verifyAuditEvents();
      setVerification(result.verification);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Failed to verify audit chain');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="container">
      <PageMeta title="Admin Audit Timeline" description="Immutable privileged action timeline." />
      <h2>Admin Audit Timeline</h2>
      <p className="text-muted">Privileged moderation/admin actions with provenance details.</p>

      {error ? <Alert type="danger">{error}</Alert> : null}
      {loading ? <p className="text-muted">Loading audit timeline...</p> : null}

      <div style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-default btn-sm" onClick={() => void load()} disabled={loading}>
          <i className="fa fa-refresh" aria-hidden="true"></i> Refresh
        </button>
        {' '}
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void verify()} disabled={verifying}>
          <i className="fa fa-shield" aria-hidden="true"></i> {verifying ? 'Verifying...' : 'Verify Chain'}
        </button>
      </div>

      {verification ? (
        <Alert type={verification.valid ? 'success' : 'danger'}>
          {verification.valid
            ? `Audit chain verified: ${verification.verifiedEvents} hashed events, ${verification.legacyEvents} legacy events.`
            : `Audit chain failed at sequence ${verification.brokenAtSequence || 'unknown'}: ${verification.reason || 'unknown reason'}`}
          {verification.headHash ? <><br /><small>Head: <code>{verification.headHash}</code></small></> : null}
        </Alert>
      ) : null}

      {!loading && events.length === 0 ? <Alert type="info">No audit events found.</Alert> : null}

      {events.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-condensed">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Summary</th>
                <th>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={String(event._id || `${event.eventType}-${event.createDate}`)}>
                  <td>{event.createDate ? new Date(event.createDate).toLocaleString() : ''}</td>
                  <td>
                    <code>{event.eventType || '-'}</code>
                  </td>
                  <td>{event.actorUsername || '-'}</td>
                  <td>
                    <span>{event.objectName || '-'}</span>
                    <br />
                    <small className="text-muted">{event.objectId || '-'}</small>
                  </td>
                  <td>{event.message || '-'}</td>
                  <td>
                    {event.chainSequence ? <><code>#{event.chainSequence}</code><br /></> : null}
                    <small className="text-muted">{event.eventHash ? event.eventHash.slice(0, 12) : 'legacy'}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default AuditTimelinePage;
