import React, { useCallback, useEffect, useMemo, useState } from 'react';
import adminApi, {
  type OperationalAlert,
  type OperationalAlertRule,
  type OperationalTelemetry,
} from '../../../services/api/admin';

function formatTime(value: string): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function statusHeight(status: string): number {
  return status === 'unavailable' ? 100 : status === 'attention' ? 72 : status === 'unknown' ? 44 : 24;
}

const OperationalTelemetryPanel: React.FC = () => {
  const [data, setData] = useState<OperationalTelemetry | null>(null);
  const [section, setSection] = useState<'alerts' | 'events' | 'rules'>('alerts');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [alertAction, setAlertAction] = useState<{ alert: OperationalAlert; action: 'acknowledge' | 'resolve' } | null>(null);
  const [actionNote, setActionNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await adminApi.operationalTelemetry()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load operational telemetry.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeAlerts = useMemo(() => data?.alerts.filter((alert) => alert.status !== 'resolved') || [], [data]);

  const updateAlert = async () => {
    if (!alertAction || actionNote.trim().length < 3) return;
    const { alert, action } = alertAction;
    setBusyId(alert._id); setError(null); setMessage(null);
    try {
      await adminApi.updateOperationalAlert(alert._id, action, actionNote.trim());
      setMessage(`Alert ${action === 'resolve' ? 'resolved' : 'acknowledged'}.`);
      setAlertAction(null); setActionNote(''); await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to update alert.'); }
    finally { setBusyId(''); }
  };

  const updateRule = async (rule: OperationalAlertRule) => {
    setBusyId(rule._id); setError(null); setMessage(null);
    try {
      await adminApi.updateOperationalAlertRule(rule._id, {
        enabled: rule.enabled, threshold: rule.threshold, windowMinutes: rule.windowMinutes,
        cooldownMinutes: rule.cooldownMinutes, severity: rule.severity,
      });
      setMessage('Alert rule saved.'); await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to update alert rule.'); }
    finally { setBusyId(''); }
  };

  const changeRule = (id: string, change: Partial<OperationalAlertRule>) => {
    setData((current) => current ? {
      ...current,
      rules: current.rules.map((rule) => rule._id === id ? { ...rule, ...change } : rule),
    } : current);
  };

  if (loading && !data) return <p className="text-muted"><i className="fa fa-spinner fa-spin" /> Loading sanitized operations history…</p>;

  return <>
    {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
    {message ? <div className="alert alert-success" role="status">{message}</div> : null}
    {data ? <>
      <section className="wt-admin-section">
        <header className="wt-admin-section-header">
          <div><h2>Health history</h2><p>Bounded status snapshots; component details and request data are not retained.</p></div>
          <span className="wt-admin-tag">{data.retention.healthDays} day retention</span>
        </header>
        <div className="wt-admin-health-history" aria-label="Recent system health history">
          {data.history.length ? data.history.slice().reverse().map((snapshot) => <div className="wt-admin-health-bar-wrap" key={snapshot._id} title={`${formatTime(snapshot.generatedAt)}: ${snapshot.overall}`}>
            <span className={`wt-admin-health-bar ${snapshot.overall}`} style={{ height: `${statusHeight(snapshot.overall)}%` }} />
          </div>) : <p className="wt-admin-empty">No persisted health history yet. Refresh Health to capture the first snapshot.</p>}
        </div>
        <div className="wt-admin-history-legend"><span className="healthy">Healthy</span><span className="unknown">Unknown</span><span className="attention">Attention</span><span className="unavailable">Unavailable</span></div>
      </section>

      <div className="wt-admin-tabs" role="tablist" aria-label="Telemetry records">
        <button type="button" role="tab" aria-selected={section === 'alerts'} className={section === 'alerts' ? 'active' : ''} onClick={() => setSection('alerts')}>Alerts <span className="badge">{activeAlerts.length}</span></button>
        <button type="button" role="tab" aria-selected={section === 'events'} className={section === 'events' ? 'active' : ''} onClick={() => setSection('events')}>Recent events</button>
        <button type="button" role="tab" aria-selected={section === 'rules'} className={section === 'rules' ? 'active' : ''} onClick={() => setSection('rules')}>Alert rules</button>
      </div>

      {section === 'alerts' ? <section className="wt-admin-section">
        <header className="wt-admin-section-header"><div><h2>Operational alerts</h2><p>Deduplicated with per-rule cooldowns and administrator notifications.</p></div></header>
        <div className="wt-admin-section-body wt-admin-alert-list">
          {data.alerts.length ? data.alerts.map((alert) => <article className={`wt-admin-alert ${alert.status} ${alert.severity}`} key={alert._id}>
            <div><span className={`wt-admin-state ${alert.severity === 'critical' ? 'unavailable' : 'attention'}`}>{alert.severity}</span><h3>{alert.title}</h3><p>{alert.summary}</p><small>Last triggered {formatTime(alert.lastTriggeredAt)} · {alert.occurrenceCount} occurrence{alert.occurrenceCount === 1 ? '' : 's'} · {alert.status}</small></div>
            {alert.status !== 'resolved' ? <div className="wt-admin-row-actions">
              {alert.status === 'active' ? <button className="btn btn-default btn-sm" disabled={busyId === alert._id} onClick={() => { setAlertAction({ alert, action: 'acknowledge' }); setActionNote(''); }}>Acknowledge</button> : null}
              <button className="btn btn-primary btn-sm" disabled={busyId === alert._id} onClick={() => { setAlertAction({ alert, action: 'resolve' }); setActionNote(''); }}>Resolve</button>
            </div> : null}
          </article>) : <p className="wt-admin-empty">No operational alerts have been raised.</p>}
        </div>
      </section> : null}

      {section === 'events' ? <section className="wt-admin-section">
        <header className="wt-admin-section-header"><div><h2>Sanitized events</h2><p>No bodies, authorization headers, IP addresses, user-agent strings, raw stacks, or export content.</p></div><span className="wt-admin-tag">{data.retention.eventsDays} day retention</span></header>
        <div className="wt-admin-section-body flush">{data.events.length ? <table className="wt-admin-table responsive"><thead><tr><th>When</th><th>Severity</th><th>Source</th><th>Event</th><th>Path</th><th>Request</th></tr></thead><tbody>{data.events.map((event) => <tr key={event._id}>
          <td data-label="When">{formatTime(event.occurredAt)}</td><td data-label="Severity"><span className={`wt-admin-state ${event.severity === 'critical' || event.severity === 'error' ? 'unavailable' : 'attention'}`}>{event.severity}</span></td>
          <td data-label="Source">{event.source}</td><td data-label="Event"><strong>{event.code}</strong><small>{event.message}</small></td><td data-label="Path" className="wt-admin-code">{event.path || '—'}</td><td data-label="Request" className="wt-admin-code">{event.requestId || '—'}</td>
        </tr>)}</tbody></table> : <div className="wt-admin-section-body"><p>No sanitized events have been recorded.</p></div>}</div>
      </section> : null}

      {section === 'rules' ? <section className="wt-admin-section">
        <header className="wt-admin-section-header"><div><h2>Alert rules</h2><p>Built-in metrics are bounded; changes require passkey confirmation and are audited.</p></div></header>
        <div className="wt-admin-section-body flush"><table className="wt-admin-table responsive wt-admin-rule-table"><thead><tr><th>Rule</th><th>Enabled</th><th>Threshold</th><th>Window</th><th>Cooldown</th><th>Severity</th><th /></tr></thead><tbody>{data.rules.map((rule) => <tr key={rule._id}>
          <td data-label="Rule"><strong>{rule.name}</strong><small>{rule.source} · {rule.metric}</small></td>
          <td data-label="Enabled"><input type="checkbox" checked={rule.enabled} onChange={(event) => changeRule(rule._id, { enabled: event.target.checked })} aria-label={`Enable ${rule.name}`} /></td>
          <td data-label="Threshold"><input className="form-control" type="number" min="1" max="10000" value={rule.threshold} onChange={(event) => changeRule(rule._id, { threshold: Number(event.target.value) })} aria-label={`${rule.name} threshold`} /></td>
          <td data-label="Window"><input className="form-control" type="number" min="1" max="1440" value={rule.windowMinutes} onChange={(event) => changeRule(rule._id, { windowMinutes: Number(event.target.value) })} aria-label={`${rule.name} window minutes`} /></td>
          <td data-label="Cooldown"><input className="form-control" type="number" min="1" max="10080" value={rule.cooldownMinutes} onChange={(event) => changeRule(rule._id, { cooldownMinutes: Number(event.target.value) })} aria-label={`${rule.name} cooldown minutes`} /></td>
          <td data-label="Severity"><select className="form-control" value={rule.severity} onChange={(event) => changeRule(rule._id, { severity: event.target.value as 'warning' | 'critical' })} aria-label={`${rule.name} severity`}><option value="warning">Warning</option><option value="critical">Critical</option></select></td>
          <td data-label="Action"><button className="btn btn-primary btn-sm" disabled={busyId === rule._id} onClick={() => void updateRule(rule)}>Save</button></td>
        </tr>)}</tbody></table></div>
      </section> : null}
      {alertAction ? <><div className="wt-admin-drawer-backdrop" aria-hidden="true" onClick={() => !busyId && setAlertAction(null)} /><aside className="wt-admin-drawer" role="dialog" aria-modal="true" aria-labelledby="alert-action-title">
        <header className="wt-admin-drawer-header"><div><h2 id="alert-action-title">{alertAction.action === 'resolve' ? 'Resolve alert' : 'Acknowledge alert'}</h2><p>{alertAction.alert.title}</p></div><button className="close" type="button" aria-label="Close alert action" onClick={() => setAlertAction(null)}>×</button></header>
        <div className="wt-admin-safe-note">This action is attributed to you and added to the privileged audit chain.</div>
        <div className="form-group" style={{ marginTop: 18 }}><label htmlFor="alert-action-note">{alertAction.action === 'resolve' ? 'Resolution note' : 'Acknowledgement note'}</label><textarea id="alert-action-note" className="form-control" rows={5} maxLength={240} value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="What was checked or changed?" /><small>{actionNote.length}/240</small></div>
        <footer className="wt-admin-drawer-footer"><button className="btn btn-default" type="button" disabled={Boolean(busyId)} onClick={() => setAlertAction(null)}>Cancel</button><button className="btn btn-primary" type="button" disabled={Boolean(busyId) || actionNote.trim().length < 3} onClick={() => void updateAlert()}>{busyId ? 'Saving…' : alertAction.action === 'resolve' ? 'Resolve alert' : 'Acknowledge'}</button></footer>
      </aside></> : null}
    </> : null}
  </>;
};

export default OperationalTelemetryPanel;
