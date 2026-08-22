import React, { useCallback, useEffect, useState } from 'react';
import PageMeta from '../../../components/common/PageMeta';
import apiClientsApi, {
  type ApiClientPolicy,
  type ApiClientRecord,
  type ApiClientScope,
} from '../../../services/api/apiClients';
import type { AdminRecord } from '../../../services/api/admin';

const SCOPES: Array<{ value: ApiClientScope; label: string; help: string }> = [
  { value: 'entries:read', label: 'Read entries', help: 'Read permitted knowledge entries and public evidence.' },
  { value: 'entries:create', label: 'Create entries', help: 'Submit new entries into pending screening.' },
  { value: 'entries:propose-edit', label: 'Propose entry edits', help: 'Propose governed edits without directly replacing accepted content.' },
  { value: 'graph:write', label: 'Edit graph links', help: 'Propose governed typed outline relationships.' },
  { value: 'civic:read', label: 'Read civic records', help: 'Read records within permitted civic tenants.' },
  { value: 'civic:contribute', label: 'Contribute civic records', help: 'Create or edit within tenant and ownership limits.' },
  { value: 'moderation:advise', label: 'Moderation advice', help: 'Submit signals, appeals, and advisory verdict analysis for human review.' },
  { value: 'translations:write', label: 'Suggest translations', help: 'Submit clearly attributed translation suggestions.' },
  { value: 'debates:participate', label: 'Debate contributions', help: 'Add attributed contributions to existing structured debates.' },
  { value: 'agent:runs:read', label: 'Manage agent runs', help: 'Read run activity and submit bounded jobs.' },
];

const ENTRY_TYPES: ApiClientPolicy['entryTypes'] = [
  'topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion',
];

const DEFAULT_POLICY: ApiClientPolicy = {
  tenantIds: [],
  entryTypes: [...ENTRY_TYPES],
  parentRootIds: [],
  ownContentOnly: true,
  maxVisibility: 'public_only',
  sourceRequired: false,
  maxBatchSize: 25,
};

const listValue = (value: string): string[] => value
  .split(/[\s,]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const ApiClientsPage: React.FC = () => {
  const [clients, setClients] = useState<ApiClientRecord[]>([]);
  const [users, setUsers] = useState<AdminRecord[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('');
  const [scopes, setScopes] = useState<ApiClientScope[]>(['entries:read', 'entries:create']);
  const [policy, setPolicy] = useState<ApiClientPolicy>(DEFAULT_POLICY);
  const [expiresAt, setExpiresAt] = useState('');
  const [rateLimit, setRateLimit] = useState(60);
  const [oneTimeToken, setOneTimeToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [clientResult, userResult] = await Promise.all([apiClientsApi.list(), apiClientsApi.users()]);
      setClients(clientResult.clients || []);
      setUsers(userResult || []);
      setUserId((current) => current || String(userResult[0]?._id || userResult[0]?.id || ''));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load agent credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const result = await apiClientsApi.create({
        name: name.trim(), description: description.trim(), userId, scopes, policy,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        rateLimitPerMinute: rateLimit,
      });
      setOneTimeToken(result.token);
      setName('');
      setDescription('');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create agent credential');
    } finally {
      setSaving(false);
    }
  };

  const rotate = async (client: ApiClientRecord) => {
    if (!window.confirm(`Rotate ${client.name}? The current token will stop working immediately.`)) return;
    try {
      const result = await apiClientsApi.rotate(client.id);
      setOneTimeToken(result.token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to rotate credential');
    }
  };

  const revoke = async (client: ApiClientRecord) => {
    if (!window.confirm(`Revoke ${client.name}? This cannot be undone.`)) return;
    try {
      await apiClientsApi.revoke(client.id);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to revoke credential');
    }
  };

  const toggleScope = (scope: ApiClientScope) => setScopes((current) => (
    current.includes(scope) ? current.filter((value) => value !== scope) : [...current, scope]
  ));
  const toggleEntryType = (entryType: ApiClientPolicy['entryTypes'][number]) => setPolicy((current) => ({
    ...current,
    entryTypes: current.entryTypes.includes(entryType)
      ? current.entryTypes.filter((value) => value !== entryType)
      : [...current.entryTypes, entryType],
  }));

  return (
    <div className="container">
      <PageMeta title="Agent API Credentials" description="Create scoped, accountable credentials for software agents." />
      <h2>Agent API Credentials</h2>
      <p className="text-muted">Every credential is tied to a user, rate-limited, revocable, and restricted to explicit scopes.</p>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {oneTimeToken ? (
        <div className="alert alert-warning" role="alert">
          <strong>Store this token now. It will not be shown again.</strong>
          <textarea className="form-control" readOnly value={oneTimeToken} rows={2} aria-label="One-time agent token" />
          <button type="button" className="btn btn-default btn-xs" onClick={() => setOneTimeToken('')}>Hide token</button>
        </div>
      ) : null}

      <div className="panel panel-info">
        <div className="panel-heading"><strong>Create credential</strong></div>
        <div className="panel-body">
          <form onSubmit={create}>
            <div className="row">
              <div className="col-sm-6 form-group"><label htmlFor="agent-name">Agent name</label><input id="agent-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} /></div>
              <div className="col-sm-6 form-group"><label htmlFor="agent-user">Accountable user</label><select id="agent-user" className="form-control" value={userId} onChange={(event) => setUserId(event.target.value)} required><option value="">Select user</option>{users.map((user) => <option key={String(user._id || user.id)} value={String(user._id || user.id)}>{String(user.username || user.email || user._id)}</option>)}</select></div>
            </div>
            <div className="form-group"><label htmlFor="agent-description">Purpose</label><input id="agent-description" className="form-control" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
            <fieldset><legend style={{ fontSize: 15 }}>Scopes</legend>{SCOPES.map((scope) => <div className="checkbox" key={scope.value}><label><input type="checkbox" checked={scopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} /> <strong>{scope.label}</strong> <span className="text-muted">{scope.help}</span></label></div>)}</fieldset>
            <fieldset>
              <legend style={{ fontSize: 15 }}>Credential boundaries</legend>
              <p className="text-muted small">Leave tenant and parent-root lists empty for no additional boundary. Entry types are always explicit.</p>
              <div className="form-group">
                <label>Entry types</label>
                <div>{ENTRY_TYPES.map((entryType) => <label className="checkbox-inline" key={entryType}><input type="checkbox" checked={policy.entryTypes.includes(entryType)} onChange={() => toggleEntryType(entryType)} /> {entryType}</label>)}</div>
              </div>
              <div className="row">
                <div className="col-sm-6 form-group"><label htmlFor="agent-tenants">Tenant IDs</label><input id="agent-tenants" className="form-control" placeholder="fixph, another-tenant" value={policy.tenantIds.join(', ')} onChange={(event) => setPolicy((current) => ({ ...current, tenantIds: listValue(event.target.value) }))} /></div>
                <div className="col-sm-6 form-group"><label htmlFor="agent-roots">Parent root IDs</label><input id="agent-roots" className="form-control" placeholder="MongoDB IDs" value={policy.parentRootIds.join(', ')} onChange={(event) => setPolicy((current) => ({ ...current, parentRootIds: listValue(event.target.value) }))} /></div>
              </div>
              <div className="row">
                <div className="col-sm-4 form-group"><label htmlFor="agent-visibility">Maximum visibility</label><select id="agent-visibility" className="form-control" value={policy.maxVisibility} onChange={(event) => setPolicy((current) => ({ ...current, maxVisibility: event.target.value as ApiClientPolicy['maxVisibility'] }))}><option value="public_only">Public only</option><option value="owned_private">Owned private content</option></select></div>
                <div className="col-sm-4 form-group"><label htmlFor="agent-batch-size">Maximum job batch size</label><input id="agent-batch-size" type="number" min={1} max={100} className="form-control" value={policy.maxBatchSize} onChange={(event) => setPolicy((current) => ({ ...current, maxBatchSize: Number(event.target.value) }))} /></div>
                <div className="col-sm-4"><div className="checkbox"><label><input type="checkbox" checked={policy.ownContentOnly} onChange={(event) => setPolicy((current) => ({ ...current, ownContentOnly: event.target.checked }))} /> Restrict edits to owned content</label></div><div className="checkbox"><label><input type="checkbox" checked={policy.sourceRequired} onChange={(event) => setPolicy((current) => ({ ...current, sourceRequired: event.target.checked }))} /> Require source metadata</label></div></div>
              </div>
            </fieldset>
            <div className="row">
              <div className="col-sm-6 form-group"><label htmlFor="agent-expiry">Expiry (optional)</label><input id="agent-expiry" type="datetime-local" className="form-control" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></div>
              <div className="col-sm-6 form-group"><label htmlFor="agent-rate">Requests per minute</label><input id="agent-rate" type="number" min={10} max={600} className="form-control" value={rateLimit} onChange={(event) => setRateLimit(Number(event.target.value))} /></div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim() || !userId || !scopes.length}>{saving ? 'Creating...' : 'Create Agent Credential'}</button>
          </form>
        </div>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading"><strong>Credentials</strong></div>
        {loading ? <div className="panel-body text-muted">Loading...</div> : (
          <div className="table-responsive"><table className="table table-striped"><thead><tr><th>Agent</th><th>Accountable user</th><th>Scopes and boundaries</th><th>Use</th><th>Status</th><th>Actions</th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><strong>{client.name}</strong><div className="text-muted small"><code>{client.tokenPrefix}...</code></div></td><td>{client.accountableUser?.username || client.userId}</td><td>{client.scopes.map((scope) => <span className="label label-default" key={scope} style={{ marginRight: 3 }}>{scope}</span>)}<div className="text-muted small">Types: {client.policy.entryTypes.join(', ') || 'none'}; visibility: {client.policy.maxVisibility}; batch: {client.policy.maxBatchSize}</div>{client.policy.tenantIds.length ? <div className="text-muted small">Tenants: {client.policy.tenantIds.join(', ')}</div> : null}{client.policy.parentRootIds.length ? <div className="text-muted small">Parent roots: {client.policy.parentRootIds.join(', ')}</div> : null}</td><td>{client.requestCount} request(s)<div className="text-muted small">{client.lastUsedAt ? `Last used ${new Date(client.lastUsedAt).toLocaleString()}` : 'Never used'}</div></td><td><span className={`label label-${client.status === 'active' ? 'success' : 'default'}`}>{client.status}</span></td><td>{client.status === 'active' ? <><button className="btn btn-xs btn-default" type="button" onClick={() => void rotate(client)}>Rotate</button>{' '}<button className="btn btn-xs btn-danger" type="button" onClick={() => void revoke(client)}>Revoke</button></> : null}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
};

export default ApiClientsPage;
