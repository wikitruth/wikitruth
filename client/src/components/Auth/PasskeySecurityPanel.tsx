import React, { useEffect, useMemo, useState } from 'react';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Input from '../Form/Input';
import { useAuth } from '../../context/AuthContext';
import passkeyApi, {
  type PasskeyRuntimeConfig,
  type PasskeyState,
} from '../../services/api/passkeys';

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : 'Unknown';
}

function isRecent(value: string | undefined, maxAgeSeconds: number): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  const age = Date.now() - timestamp;
  return Number.isFinite(timestamp) && age >= 0 && age <= maxAgeSeconds * 1000;
}

const PasskeySecurityPanel: React.FC = () => {
  const { user, refreshAuth } = useAuth();
  const [config, setConfig] = useState<PasskeyRuntimeConfig | null>(null);
  const [state, setState] = useState<PasskeyState | null>(null);
  const [name, setName] = useState('My passkey');
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>('load');
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const load = async () => {
    setBusy('load');
    setLoadFailed(false);
    setError(null);
    try {
      const nextConfig = await passkeyApi.config();
      setConfig(nextConfig);
      if (nextConfig.enabled && nextConfig.isCanonicalOrigin) {
        const nextState = await passkeyApi.state();
        setState(nextState);
        setNames(Object.fromEntries(nextState.credentials.map(item => [item.id, item.name])));
      }
    } catch (loadError) {
      setLoadFailed(true);
      setError(loadError instanceof Error ? loadError.message : 'Could not load passkey settings.');
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const isAdmin = Boolean(user?.roles?.admin);
  const hasRecentPasskey = Boolean(
    config && state?.assurance?.method === 'passkey'
      && isRecent(state.assurance.passkeyVerifiedAt, config.stepUpMaxAgeSeconds)
  );
  const hasRecentRecovery = Boolean(
    config && state?.assurance?.method === 'recovery_code'
      && isRecent(state.assurance.recoveredAt, config.stepUpMaxAgeSeconds)
  );
  const canAddPasskey = Boolean(
    state && (state.credentials.length === 0 || hasRecentPasskey || hasRecentRecovery)
  );
  const protectsMinimumCredentials = Boolean(
    config && state
      && ((isAdmin && config.adminStepUpRequired) || state.passwordLoginDisabled)
      && state.credentials.length <= 2
  );
  const canTogglePassword = Boolean(
    state && (state.passwordLoginDisabled
      ? hasRecentPasskey || hasRecentRecovery
      : hasRecentPasskey)
  );
  const readiness = useMemo(() => {
    if (!state) return '';
    if (state.credentials.length < 2) return 'Add a second passkey before disabling password login.';
    if (state.recovery.unusedCount < 1) return 'Generate recovery codes before disabling password login.';
    return 'Email verification is also required before password login can be disabled.';
  }, [state]);

  const run = async (key: string, action: () => Promise<void>, message: string) => {
    setBusy(key);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(message);
      await load();
      await refreshAuth?.();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Passkey operation failed.');
    } finally {
      setBusy(null);
    }
  };

  const downloadRecoveryCodes = () => {
    const blob = new Blob(
      [`Wikitruth recovery codes\nGenerated ${new Date().toISOString()}\n\n${recoveryCodes.join('\n')}\n`],
      { type: 'text/plain;charset=utf-8' }
    );
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'wikitruth-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="panel panel-default" id="passkeys">
      <div className="panel-heading">
        <h3 className="panel-title"><i className="fa fa-key" /> Passkeys &amp; Recovery</h3>
      </div>
      <div className="panel-body">
        {error ? (
          <Alert type="danger" dismissible onDismiss={() => setError(null)}>
            {error}
            {loadFailed && busy !== 'load' ? (
              <Button type="button" size="sm" onClick={() => void load()} style={{ marginLeft: 8 }}>
                Retry
              </Button>
            ) : null}
          </Alert>
        ) : null}
        {success ? <Alert type="success" dismissible onDismiss={() => setSuccess(null)}>{success}</Alert> : null}
        {busy === 'load' && !config ? <p className="text-muted">Loading passkey security...</p> : null}
        {config && !config.enabled ? <p className="text-muted">Passkeys are not enabled for this environment.</p> : null}
        {config?.enabled && !config.isCanonicalOrigin ? (
          <div>
            <p>Passkeys are managed on Wikitruth&apos;s secure sign-in domain and work across connected country tenants.</p>
            <a className="btn btn-primary" href={`${config.canonicalOrigin}/account/settings#passkeys`}>
              <i className="fa fa-external-link" /> Manage passkeys on Wikitruth
            </a>
          </div>
        ) : null}
        {config?.enabled && config.isCanonicalOrigin && state ? (
          <>
            <p className="text-muted">
              Passkeys use your device unlock and resist phishing. Keep at least two for administrator or passwordless accounts.
            </p>
            {isAdmin && config.adminStepUpRequired ? (
              <Alert type={state.credentials.length >= 2 ? 'info' : 'warning'}>
                Administrator actions require a recent passkey check and two registered passkeys.
              </Alert>
            ) : null}
            {state.credentials.length > 0 && !hasRecentPasskey ? (
              <Alert type={hasRecentRecovery ? 'info' : 'warning'}>
                {hasRecentRecovery
                  ? 'Your recovery session can add a replacement passkey. Confirm with a passkey to rename or revoke credentials and generate recovery codes.'
                  : 'Confirm with a passkey before adding or managing credentials.'}{' '}
                <Button
                  type="button"
                  size="sm"
                  icon={busy === 'step-up' ? 'spinner fa-spin' : 'key'}
                  disabled={Boolean(busy)}
                  onClick={() => run('step-up', async () => {
                    await passkeyApi.authenticate('step_up');
                  }, 'Identity confirmed with a passkey.')}
                >
                  {busy === 'step-up' ? 'Waiting for device...' : 'Confirm with passkey'}
                </Button>
              </Alert>
            ) : null}
            <div className="form-inline" style={{ marginBottom: '18px' }}>
              <div className="form-group" style={{ marginRight: '8px' }}>
                <label className="sr-only" htmlFor="new-passkey-name">Passkey name</label>
                <input
                  id="new-passkey-name"
                  className="form-control"
                  value={name}
                  maxLength={80}
                  onChange={event => setName(event.target.value)}
                  placeholder="e.g. MacBook Touch ID"
                />
              </div>
              <Button
                type="button"
                variant="primary"
                icon={busy === 'register' ? 'spinner fa-spin' : 'key'}
                disabled={Boolean(busy) || name.trim().length < 2 || !canAddPasskey}
                onClick={() => run('register', async () => { await passkeyApi.register(name.trim()); }, 'Passkey added.')}
              >
                {busy === 'register' ? 'Waiting for device...' : 'Add passkey'}
              </Button>
            </div>

            {state.credentials.length === 0 ? <Alert type="warning">No passkeys are registered yet.</Alert> : null}
            <div className="list-group">
              {state.credentials.map(credential => {
                const isAssuranceCredential = hasRecentPasskey
                  && state.assurance?.passkeyCredentialId === credential.id;
                let revokeTitle: string | undefined;
                if (protectsMinimumCredentials) {
                  revokeTitle = 'Keep at least two active passkeys for this account.';
                } else if (isAssuranceCredential) {
                  revokeTitle = 'Confirm with another passkey before revoking this one.';
                } else if (!hasRecentPasskey) {
                  revokeTitle = 'Confirm with a passkey first.';
                }
                return (
                  <div className="list-group-item" key={credential.id}>
                    <div className="row">
                      <div className="col-sm-5">
                        <Input
                          name={`passkey-${credential.id}`}
                          label="Passkey name"
                          value={names[credential.id] || ''}
                          maxLength={80}
                          onChange={event => setNames(current => ({ ...current, [credential.id]: event.target.value }))}
                        />
                      </div>
                      <div className="col-sm-4 text-muted" style={{ paddingTop: '25px' }}>
                        {credential.backedUp ? 'Synced passkey' : 'Device-bound passkey'}<br />
                        Added {formatDate(credential.createDate)}<br />
                        Last used {formatDate(credential.lastUsedAt)}
                      </div>
                      <div className="col-sm-3 text-right" style={{ paddingTop: '25px' }}>
                        <Button
                          type="button"
                          size="sm"
                          disabled={Boolean(busy) || !hasRecentPasskey || (names[credential.id] || '').trim().length < 2}
                          onClick={() => run(`rename-${credential.id}`, async () => {
                            await passkeyApi.rename(credential.id, names[credential.id].trim());
                          }, 'Passkey renamed.')}
                        >Save</Button>{' '}
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={Boolean(busy) || !hasRecentPasskey || protectsMinimumCredentials || isAssuranceCredential}
                          title={revokeTitle}
                          onClick={() => {
                            if (window.confirm(`Revoke "${credential.name}"? This cannot be undone.`)) {
                              void run(`revoke-${credential.id}`, async () => {
                                await passkeyApi.revoke(credential.id);
                              }, 'Passkey revoked.');
                            }
                          }}
                        >Revoke</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <hr />
            <h4>Recovery codes</h4>
            <p>
              {state.recovery.configured
                ? `${state.recovery.unusedCount} unused recovery code${state.recovery.unusedCount === 1 ? '' : 's'} remain.`
                : 'No recovery codes have been generated.'}
            </p>
            <Button
              type="button"
              variant="warning"
              disabled={Boolean(busy) || state.credentials.length === 0 || !hasRecentPasskey}
              onClick={() => run('recovery', async () => {
                const result = await passkeyApi.generateRecoveryCodes();
                setRecoveryCodes(result.codes);
              }, 'New recovery codes generated. Previous codes no longer work.')}
            >Generate new recovery codes</Button>
            {recoveryCodes.length ? (
              <Alert type="warning">
                <strong>Save these now. They will not be shown again.</strong>
                <pre style={{ marginTop: '10px', userSelect: 'all' }}>{recoveryCodes.join('\n')}</pre>
                <Button type="button" size="sm" onClick={downloadRecoveryCodes} icon="download">Download codes</Button>
              </Alert>
            ) : null}

            <hr />
            <h4>Password fallback</h4>
            <p>
              Password login is currently <strong>{state.passwordLoginDisabled ? 'disabled' : 'enabled'}</strong>.
            </p>
            {!state.passwordLoginDisabled ? <p className="help-block">{readiness}</p> : null}
            <Button
              type="button"
              variant={state.passwordLoginDisabled ? 'default' : 'danger'}
              disabled={Boolean(busy) || !canTogglePassword}
              onClick={() => run('password-login', async () => {
                await passkeyApi.setPasswordLogin(state.passwordLoginDisabled);
              }, state.passwordLoginDisabled ? 'Password login enabled.' : 'Password login disabled.')}
            >
              {state.passwordLoginDisabled ? 'Enable password login' : 'Disable password login'}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PasskeySecurityPanel;
