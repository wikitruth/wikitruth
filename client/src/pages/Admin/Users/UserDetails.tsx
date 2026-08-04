import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Alert from '../../../components/common/Alert';
import Button from '../../../components/common/Button';
import adminApi, { type AdminRecord, type UserSecurity } from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';
import AdminOperationsShell from '../common/AdminOperationsShell';
import '../adminOperations.css';

function recordId(record: AdminRecord): string {
  return String(record._id || record.id || '');
}

function recordLabel(record: AdminRecord): string {
  const label = record.name || record.title || record.username || record.email;
  return typeof label === 'string' && label.trim() ? label : `Record ${recordId(record).slice(-6)}`;
}

function dateLabel(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'No recent authenticated activity';
}

const UserDetails: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [security, setSecurity] = useState<UserSecurity | null>(null);
  const [adminRecords, setAdminRecords] = useState<AdminRecord[]>([]);
  const [accountRecords, setAccountRecords] = useState<AdminRecord[]>([]);
  const [linkedAdminId, setLinkedAdminId] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(true);

  const loadOperations = useCallback(async () => {
    if (!id) return;
    setLoadingSecurity(true);
    const [securityResult, adminsResult, accountsResult] = await Promise.allSettled([
      adminApi.userSecurity(id), adminApi.administrators({ limit: 100 }), adminApi.accounts({ limit: 100 }),
    ]);
    if (securityResult.status === 'fulfilled') {
      setSecurity(securityResult.value.security);
      setLinkedAdminId(securityResult.value.security.user.linkedAdminId);
      setLinkedAccountId(securityResult.value.security.user.linkedAccountId);
    }
    else setError(securityResult.reason instanceof Error ? securityResult.reason.message : 'Failed to load account security');
    if (adminsResult.status === 'fulfilled') setAdminRecords(adminsResult.value.items);
    if (accountsResult.status === 'fulfilled') setAccountRecords(accountsResult.value.items);
    setLoadingSecurity(false);
  }, [id]);

  useEffect(() => { void loadOperations(); }, [loadOperations]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      setBusy(true); setError(null); setMessage(null);
      await action();
      setMessage(successMessage); setPassword(''); setReason('');
      await loadOperations();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed');
    } finally { setBusy(false); }
  };

  const securityAction = async (action: string, label: string, destructive = false) => {
    if (action === 'lock' && !reason.trim()) {
      setError('Add a reason before locking this account.');
      return;
    }
    if (destructive && !window.confirm(`${label}? This privileged action is recorded in the audit timeline.`)) return;
    await runAction(() => adminApi.runUserSecurityAction(id, action, reason.trim()), `${label} completed.`);
  };

  const securityFacts = useMemo(() => security ? [
    ['Active sessions', security.activeSessions], ['Passkeys', security.activePasskeys],
    ['API clients', security.activeApiClients], ['Recovery codes', security.unusedRecoveryCodes],
  ] : [], [security]);

  return (
    <AdminOperationsShell
      title="User details"
      description="Review profile data, access posture, recovery readiness, and reversible account controls in one place."
      actions={<Link className="btn btn-default" to="/admin/people"><i className="fa fa-arrow-left" aria-hidden="true" /> Back to people</Link>}
    >
      <AdminDetailsPage
        title="User details"
        backPath="/admin/people"
        embedded
        showRecord={false}
        loadItem={adminApi.user}
        hiddenFields={['_id', 'roles', 'adminOperations', 'securityOperations']}
        updateAction={{
          onUpdate: async (userId, payload) => {
            const updated = await adminApi.updateUser(userId, payload);
            const roles = (payload as { roles?: { screener?: unknown; reviewer?: unknown } }).roles;
            await adminApi.updateUserRoles(userId, { screener: Boolean(roles?.screener), reviewer: Boolean(roles?.reviewer) });
            return updated;
          },
          fields: [
            { path: 'username', label: 'Username', required: true },
            { path: 'email', label: 'Email', type: 'email' },
            { path: 'isActive', label: 'Status' },
            { path: 'roles.screener', label: 'Can screen', type: 'checkbox' },
            { path: 'roles.reviewer', label: 'Can review', type: 'checkbox' },
          ],
        }}
      />

      <div className="wt-admin-account-operations">
        <div className="wt-admin-page-header compact">
          <div><h2>Account operations</h2><p>Readable identity links, access posture, and guarded recovery controls for this account.</p></div>
          <div className="wt-admin-page-actions"><Link className="btn btn-default" to="/admin/audit">View audit trail</Link><Button type="button" variant="default" icon={loadingSecurity ? 'spinner fa-spin' : 'refresh'} onClick={() => void loadOperations()} disabled={busy || loadingSecurity}>Refresh</Button></div>
        </div>
        {error ? <Alert type="danger">{error}</Alert> : null}
        {message ? <Alert type="success">{message}</Alert> : null}

        {loadingSecurity ? <p className="text-muted"><i className="fa fa-spinner fa-spin" aria-hidden="true" /> Loading measured security state…</p> : null}
        {!loadingSecurity && security ? <>
          <section className="wt-admin-status-strip" aria-label="Account security status">
            {securityFacts.map(([label, value]) => <div className="wt-admin-status-item compact" key={String(label)}><span className="wt-admin-status-icon"><i className="fa fa-shield" aria-hidden="true" /></span><span className="wt-admin-status-copy"><strong>{label}</strong><span>{value}</span></span></div>)}
          </section>

          <div className="wt-admin-health-grid">
            <section className="wt-admin-section">
              <header className="wt-admin-section-header"><div><h3>Security posture</h3><p>Last seen: {dateLabel(security.lastSeen)}</p></div><span className={`wt-admin-state ${security.locked ? 'unavailable' : 'healthy'}`}>{security.locked ? 'Locked' : 'Available'}</span></header>
              <div className="wt-admin-section-body">
                <dl className="wt-admin-detail-list">
                  <div className="wt-admin-detail-row"><dt>Identity verified</dt><dd>{security.verified ? 'Yes' : 'No'}</dd></div>
                  <div className="wt-admin-detail-row"><dt>Password sign-in</dt><dd>{security.user.passwordLoginDisabled ? 'Disabled' : 'Enabled'}</dd></div>
                  <div className="wt-admin-detail-row"><dt>Account state</dt><dd>{security.user.state}</dd></div>
                </dl>
                <div className="form-group"><label htmlFor="security-action-reason">Administrative reason</label><textarea id="security-action-reason" className="form-control" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for locking; recorded with privileged actions" /></div>
                <div className="wt-admin-button-row">
                  <Button type="button" variant="warning" icon="ban" onClick={() => void securityAction(security.locked ? 'unlock' : 'lock', security.locked ? 'Unlock account' : 'Lock account', true)} disabled={busy}>{security.locked ? 'Unlock account' : 'Lock account'}</Button>
                  <Button type="button" variant="default" icon="sign-out" onClick={() => void securityAction('revoke_sessions', 'Revoke all sessions', true)} disabled={busy || security.activeSessions === 0}>Revoke sessions</Button>
                  <Button type="button" variant="default" icon="check-circle" onClick={() => void securityAction(security.verified ? 'unverify' : 'verify', security.verified ? 'Remove verification' : 'Verify identity', true)} disabled={busy}>{security.verified ? 'Remove verification' : 'Verify identity'}</Button>
                </div>
              </div>
            </section>

            <section className="wt-admin-section">
              <header className="wt-admin-section-header"><div><h3>Authentication recovery</h3><p>Password disablement requires two passkeys and unused recovery codes.</p></div></header>
              <div className="wt-admin-section-body">
                <div className="wt-admin-safe-note"><strong>Recovery guard:</strong> {security.activePasskeys >= 2 && security.unusedRecoveryCodes >= 1 ? 'Ready for passwordless-only access.' : 'Keep password access enabled until recovery requirements are met.'}</div>
                <div className="wt-admin-button-row">
                  <Button type="button" variant="default" icon="key" onClick={() => void securityAction(security.user.passwordLoginDisabled ? 'enable_password' : 'disable_password', security.user.passwordLoginDisabled ? 'Enable password sign-in' : 'Disable password sign-in', true)} disabled={busy || (!security.user.passwordLoginDisabled && (security.activePasskeys < 2 || security.unusedRecoveryCodes < 1))}>{security.user.passwordLoginDisabled ? 'Enable password sign-in' : 'Disable password sign-in'}</Button>
                </div>
                <hr />
                <div className="form-group"><label htmlFor="admin-reset-password">Set a temporary password</label><input id="admin-reset-password" className="form-control" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></div>
                <Button type="button" variant="warning" icon="refresh" disabled={busy || password.length < 6} onClick={() => void runAction(() => adminApi.resetUserPassword(id, password), 'Temporary password set. Ask the user to replace it after signing in.')}>Set temporary password</Button>
              </div>
            </section>
          </div>

          <section className="wt-admin-section">
            <header className="wt-admin-section-header"><div><h3>Linked records</h3><p>Choose by readable identity; internal record IDs remain implementation details.</p></div></header>
            <div className="wt-admin-section-body wt-admin-link-grid">
              <div><label htmlFor="admin-role-link">Administrator profile</label><select id="admin-role-link" className="form-control" value={linkedAdminId} onChange={(event) => setLinkedAdminId(event.target.value)}><option value="">No administrator profile</option>{adminRecords.map((record) => <option value={recordId(record)} key={recordId(record)}>{recordLabel(record)}</option>)}</select><div className="wt-admin-button-row"><Button type="button" variant="primary" disabled={busy || !linkedAdminId} onClick={() => void runAction(() => adminApi.linkUserAdminRole(id, linkedAdminId), 'Administrator profile linked.')}>Save link</Button><Button type="button" variant="default" disabled={busy || !linkedAdminId} onClick={() => void runAction(() => adminApi.unlinkUserAdminRole(id), 'Administrator profile unlinked.')}>Unlink</Button></div></div>
              <div><label htmlFor="account-role-link">Public account profile</label><select id="account-role-link" className="form-control" value={linkedAccountId} onChange={(event) => setLinkedAccountId(event.target.value)}><option value="">No public account profile</option>{accountRecords.map((record) => <option value={recordId(record)} key={recordId(record)}>{recordLabel(record)}</option>)}</select><div className="wt-admin-button-row"><Button type="button" variant="primary" disabled={busy || !linkedAccountId} onClick={() => void runAction(() => adminApi.linkUserAccountRole(id, linkedAccountId), 'Public account profile linked.')}>Save link</Button><Button type="button" variant="default" disabled={busy || !linkedAccountId} onClick={() => void runAction(() => adminApi.unlinkUserAccountRole(id), 'Public account profile unlinked.')}>Unlink</Button></div></div>
            </div>
          </section>
          <p className="wt-admin-safe-note"><strong>Permanent deletion is intentionally absent.</strong> Use quarantine or deactivate from <Link to="/admin/people">People operations</Link> so contributions remain attributable and recovery stays possible.</p>
        </> : null}
      </div>
    </AdminOperationsShell>
  );
};

export default UserDetails;
