import React, { useCallback, useEffect, useState } from 'react';

import Alert from '../../../components/common/Alert';
import Button from '../../../components/common/Button';
import adminApi, { type AdminSystemHealth, type BackupSnapshot, type HealthComponent, type HealthStatus, type RestorePreview } from '../../../services/api/admin';
import AdminOperationsShell from '../common/AdminOperationsShell';
import OperationalTelemetryPanel from '../SystemOperations/OperationalTelemetryPanel';

function stateLabel(value: HealthStatus): string {
  return value === 'healthy' ? 'Healthy' : value === 'attention' ? 'Needs attention'
    : value === 'unavailable' ? 'Unavailable' : 'Unknown';
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function detailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

const componentOrder = [
  ['application', 'Application', 'cube'], ['mongo', 'MongoDB', 'database'],
  ['email', 'Email delivery', 'envelope-o'], ['notifications', 'Notifications', 'bell-o'],
  ['storage', 'Storage', 'hdd-o'], ['backup', 'Backup', 'archive'],
] as const;

const DBBackupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'health' | 'telemetry' | 'backups'>(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'alerts'
      ? 'telemetry' : 'health'
  ));
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [hasGitBackup, setHasGitBackup] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('');
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [restorePublicData, setRestorePublicData] = useState(true);
  const [restorePrivateData, setRestorePrivateData] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [healthResult, backupResult] = await Promise.allSettled([adminApi.systemHealth(), adminApi.dbBackupStatus()]);
    if (healthResult.status === 'fulfilled') setHealth(healthResult.value.health);
    const errors: string[] = [];
    if (healthResult.status === 'rejected') errors.push(healthResult.reason instanceof Error ? healthResult.reason.message : 'Failed to load system health');
    if (backupResult.status === 'fulfilled') {
      setSnapshots(backupResult.value.backup.snapshots);
      setHasGitBackup(backupResult.value.backup.hasGitBackup);
      setSelectedSnapshot((current) => current || backupResult.value.backup.latestSnapshot?.id || '');
    } else errors.push(backupResult.reason instanceof Error ? backupResult.reason.message : 'Failed to load backup snapshots');
    setError(errors.length ? errors.join(' ') : null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createSnapshot = async () => {
    setRunning(true); setError(null); setMessage(null);
    try {
      const result = await adminApi.runDbBackup();
      setMessage(`Snapshot ${result.backup.id} completed with ${result.backup.totalDocuments.toLocaleString()} documents.`);
      await load(); setActiveTab('backups'); setSelectedSnapshot(result.backup.id);
    } catch (runError) { setError(runError instanceof Error ? runError.message : 'Snapshot creation failed'); }
    finally { setRunning(false); }
  };

  const previewRestore = async (snapshotId = selectedSnapshot) => {
    if (!snapshotId) return;
    setRunning(true); setError(null); setMessage(null);
    try {
      const result = await adminApi.previewDbRestore(snapshotId, { restorePublicData, restorePrivateData });
      setPreview(result.preview); setConfirmText('');
    } catch (runError) { setError(runError instanceof Error ? runError.message : 'Restore preview failed'); }
    finally { setRunning(false); }
  };

  const restore = async () => {
    if (!preview || confirmText !== preview.confirmationPhrase) return;
    setRunning(true); setError(null);
    try {
      const result = await adminApi.runDbRestore({
        snapshotId: preview.snapshot.id, previewToken: preview.token, confirmText,
      });
      setMessage(`Snapshot ${result.restore.snapshotId} restored. Automatic rollback snapshot: ${result.restore.preRestoreSnapshotId}.`);
      setPreview(null); await load();
    } catch (runError) { setError(runError instanceof Error ? runError.message : 'Restore failed'); }
    finally { setRunning(false); }
  };

  const components = health?.components || {};
  const healthDetails: Array<[string, unknown]> = [
    ['Application version', components.application?.detail?.version],
    ['Deployed commit', components.application?.detail?.deployedCommit],
    ['Process uptime (seconds)', components.application?.detail?.uptimeSeconds],
    ['MongoDB version', components.mongo?.detail?.version],
    ['Disk free', components.storage?.detail?.freeBytes ? formatBytes(Number(components.storage.detail.freeBytes)) : null],
    ['Disk free percent', components.storage?.detail?.freePercent ? `${components.storage.detail.freePercent}%` : null],
    ['Email queued', components.email?.detail?.queued],
    ['Email failed', components.email?.detail?.failed],
    ['Oldest queued email', components.email?.detail?.oldestQueuedAt],
    ['Last backup', components.backup?.detail?.createdAt],
    ['Off-site verified', components.backup?.detail?.offsiteVerifiedAt],
    ['Audit chain', components.audit?.summary],
    ['Canonical endpoint', components.external?.detail?.origin],
    ['Endpoint response', components.external?.detail?.httpStatus],
  ];

  return (
    <AdminOperationsShell
      title="System operations"
      description="Inspect measured platform health and manage checksum-verified recovery snapshots. No shell or arbitrary database controls are exposed."
      actions={<Button type="button" variant="default" icon={loading ? 'spinner fa-spin' : 'refresh'} onClick={() => void load()} disabled={loading || running}>Refresh</Button>}
    >
      {error ? <Alert type="danger">{error}</Alert> : null}
      {message ? <Alert type="success">{message}</Alert> : null}
      <div className="wt-admin-tabs" role="tablist" aria-label="System operations sections">
        <button type="button" role="tab" aria-selected={activeTab === 'health'} className={activeTab === 'health' ? 'active' : ''} onClick={() => setActiveTab('health')}>Health</button>
        <button type="button" role="tab" aria-selected={activeTab === 'telemetry'} className={activeTab === 'telemetry' ? 'active' : ''} onClick={() => setActiveTab('telemetry')}>Events & alerts</button>
        <button type="button" role="tab" aria-selected={activeTab === 'backups'} className={activeTab === 'backups' ? 'active' : ''} onClick={() => setActiveTab('backups')}>Backups</button>
      </div>

      {loading ? <p className="text-muted"><i className="fa fa-spinner fa-spin" aria-hidden="true" /> Measuring system operations…</p> : null}
      {!loading && health ? <section className="wt-admin-status-strip" aria-label="System status">
        {componentOrder.map(([key, label, icon]) => {
          const item = components[key] as HealthComponent | undefined;
          return <div className="wt-admin-status-item" key={key}><span className="wt-admin-status-icon"><i className={`fa fa-${icon}`} aria-hidden="true" /></span><span className="wt-admin-status-copy"><strong>{label}</strong><span className={`wt-admin-state ${item?.status || 'unknown'}`}>{stateLabel(item?.status || 'unknown')}</span><small>{item?.summary || 'No measurement available.'}</small></span></div>;
        })}
      </section> : null}

      {!loading && activeTab === 'health' && health ? <div className="wt-admin-health-grid">
        <section className="wt-admin-section"><header className="wt-admin-section-header"><div><h2>Overall status</h2><p>Generated {new Date(health.generatedAt).toLocaleString()}</p></div><span className={`wt-admin-state ${health.overall}`}>{stateLabel(health.overall)}</span></header><div className="wt-admin-section-body">
          {Object.entries(components).map(([key, item]) => <div className="wt-admin-preview-block" key={key}><h3>{key.charAt(0).toUpperCase() + key.slice(1)}</h3><span className={`wt-admin-state ${item.status}`}>{stateLabel(item.status)}</span><p>{item.summary}</p></div>)}
          <div className="wt-admin-preview-block"><h3>Migration evidence</h3><span className={`wt-admin-state ${health.migrationLedger.status}`}>{stateLabel(health.migrationLedger.status)}</span><p>{health.migrationLedger.summary}</p></div>
          <div className="wt-admin-preview-block"><h3>Recent client errors</h3><span className={`wt-admin-state ${health.recentErrors.status}`}>{stateLabel(health.recentErrors.status)}</span><p>{health.recentErrors.summary}</p></div>
        </div></section>
        <section className="wt-admin-section"><header className="wt-admin-section-header"><div><h2>Health details</h2><p>Measured values; unavailable evidence remains an honest em dash.</p></div></header><div className="wt-admin-section-body"><dl className="wt-admin-detail-list">{healthDetails.map(([label, value]) => <div className="wt-admin-detail-row" key={label}><dt>{label}</dt><dd className={label.includes('commit') ? 'wt-admin-code' : ''}>{detailValue(value)}</dd></div>)}</dl></div></section>
      </div> : null}

      {!loading && activeTab === 'telemetry' ? <OperationalTelemetryPanel /> : null}

      {!loading && activeTab === 'backups' ? <>
        <section className="wt-admin-section">
          <header className="wt-admin-section-header"><div><h2>Recovery snapshots</h2><p>Each complete snapshot has collection counts and a SHA-256 integrity manifest.</p></div><Button type="button" variant="primary" icon={running ? 'spinner fa-spin' : 'archive'} onClick={() => void createSnapshot()} disabled={running}>{running ? 'Creating…' : 'Create snapshot'}</Button></header>
          <div className="wt-admin-section-body flush">
            {snapshots.length ? <table className="wt-admin-table responsive"><thead><tr><th>Snapshot</th><th>Created</th><th>Size</th><th>Documents</th><th>Integrity</th><th>Off-site</th><th>Action</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id}>
              <td data-label="Snapshot"><label style={{ margin: 0 }}><input type="radio" name="snapshot" checked={selectedSnapshot === snapshot.id} onChange={() => setSelectedSnapshot(snapshot.id)} /> <span className="wt-admin-code">{snapshot.id}</span>{snapshot.kind === 'pre_restore' ? <span className="wt-admin-tag">pre-restore</span> : null}</label></td>
              <td data-label="Created">{new Date(snapshot.createdAt).toLocaleString()}</td><td data-label="Size">{formatBytes(snapshot.totalBytes)}</td><td data-label="Documents">{snapshot.totalDocuments.toLocaleString()}</td>
              <td data-label="Integrity"><span className={`wt-admin-state ${snapshot.complete ? 'healthy' : 'unavailable'}`}>{snapshot.complete ? 'Manifest complete' : 'Incomplete'}</span></td>
              <td data-label="Off-site"><span className={`wt-admin-state ${snapshot.offsite.verifiedAt ? 'healthy' : 'unknown'}`}>{snapshot.offsite.verifiedAt ? `Verified ${new Date(snapshot.offsite.verifiedAt).toLocaleString()}` : snapshot.offsite.configured ? 'Configured; not verified' : 'Not configured'}</span></td>
              <td data-label="Action"><Button type="button" variant="default" size="sm" onClick={() => { setSelectedSnapshot(snapshot.id); void previewRestore(snapshot.id); }} disabled={running}>Preview restore</Button></td>
            </tr>)}</tbody></table> : <div className="wt-admin-section-body"><p>No operational snapshots exist yet.</p><p className="text-muted">Create the first snapshot before planning any data change.</p></div>}
          </div>
        </section>
        <div className="wt-admin-health-grid">
          <section className="wt-admin-section"><header className="wt-admin-section-header"><h2>Restore scope</h2></header><div className="wt-admin-section-body"><label className="checkbox"><input type="checkbox" checked={restorePublicData} onChange={(event) => setRestorePublicData(event.target.checked)} /> Public data</label><label className="checkbox"><input type="checkbox" checked={restorePrivateData} onChange={(event) => setRestorePrivateData(event.target.checked)} /> Private user data</label><Button type="button" variant="default" onClick={() => void previewRestore()} disabled={running || !selectedSnapshot || (!restorePublicData && !restorePrivateData)}>Preview selected restore</Button></div></section>
          <section className="wt-admin-section"><header className="wt-admin-section-header"><h2>Off-site evidence</h2></header><div className="wt-admin-section-body"><p className={`wt-admin-state ${hasGitBackup ? 'unknown' : 'attention'}`}>{hasGitBackup ? 'Off-site integration is configured, but each copy must still be independently verified.' : 'No off-site backup integration is configured.'}</p><p className="text-muted">Wikitruth never labels a copy verified based only on configuration.</p></div></section>
        </div>
      </> : null}

      {preview ? <><div className="wt-admin-drawer-backdrop" aria-hidden="true" onClick={() => !running && setPreview(null)} /><aside className="wt-admin-drawer" role="dialog" aria-modal="true" aria-labelledby="restore-preview-title">
        <header className="wt-admin-drawer-header"><div><h2 id="restore-preview-title">Restore preview</h2><p className="text-muted wt-admin-code">{preview.snapshot.id}</p></div><button className="close" type="button" aria-label="Close restore preview" onClick={() => setPreview(null)} disabled={running}>×</button></header>
        <section className="wt-admin-preview-block"><h3>Safety checks</h3><p className={`wt-admin-state ${preview.verification.valid ? 'healthy' : 'unavailable'}`}><i className="fa fa-check-circle" aria-hidden="true" /> Checksum {preview.verification.valid ? 'verified' : 'failed'}</p><p className={`wt-admin-state ${preview.isolatedRestoreTest.valid ? 'healthy' : 'unavailable'}`}><i className="fa fa-database" aria-hidden="true" /> {preview.isolatedRestoreTest.message}</p><p className="wt-admin-state healthy"><i className="fa fa-archive" aria-hidden="true" /> Automatic pre-restore snapshot enabled</p></section>
        <section className="wt-admin-preview-block"><h3>Current versus snapshot</h3><table className="wt-admin-table responsive"><thead><tr><th>Collection</th><th>Current</th><th>Snapshot</th><th>Change</th></tr></thead><tbody>{preview.comparison.map((row) => <tr key={`${row.scope}:${row.collection}`}><td data-label="Collection">{row.collection}<small style={{ display: 'block' }}>{row.scope}</small></td><td data-label="Current">{row.current ?? '—'}</td><td data-label="Snapshot">{row.snapshot}</td><td data-label="Change">{row.change === null ? '—' : row.change > 0 ? `+${row.change}` : row.change}</td></tr>)}</tbody></table></section>
        <section className="wt-admin-preview-block"><div className="wt-admin-warning"><strong>Restore is an exceptional action.</strong><p>It replaces selected live data. A rollback snapshot is created automatically and the action is audited.</p></div><div className="form-group" style={{ marginTop: 16 }}><label htmlFor="restore-confirmation">Type <span className="wt-admin-code">{preview.confirmationPhrase}</span></label><input id="restore-confirmation" className="form-control wt-admin-code" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} autoComplete="off" /></div></section>
        <footer className="wt-admin-drawer-footer"><Button type="button" variant="default" onClick={() => setPreview(null)} disabled={running}>Cancel</Button><Button type="button" variant="danger" icon="lock" onClick={() => void restore()} disabled={running || confirmText !== preview.confirmationPhrase}>{running ? 'Restoring…' : 'Restore snapshot'}</Button></footer>
      </aside></> : null}
    </AdminOperationsShell>
  );
};

export default DBBackupPage;
