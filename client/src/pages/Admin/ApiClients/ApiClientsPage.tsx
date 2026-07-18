import React, { useCallback, useEffect, useState } from 'react';
import PageMeta from '../../../components/common/PageMeta';
import apiClientsApi, { type ApiClientRecord, type ApiClientScope } from '../../../services/api/apiClients';
import type { AdminRecord } from '../../../services/api/admin';

const SCOPES: Array<{ value: ApiClientScope; label: string; help: string }> = [
  { value: 'entries:read', label: 'Read entries', help: 'Read public knowledge and civic API data.' },
  { value: 'contributions:write', label: 'Create contributions', help: 'Submit pending topics, claims, questions, answers, artifacts, issues, and comments.' },
  { value: 'graph:write', label: 'Edit graph links', help: 'Propose governed typed outline relationships.' },
  { value: 'civic:write', label: 'Edit civic records', help: 'Contribute within tenant membership limits.' },
  { value: 'moderation:write', label: 'Moderation contributions', help: 'Submit votes or change requests only when the owner has the required role.' },
];

const ApiClientsPage: React.FC = () => {
  const [clients, setClients] = useState<ApiClientRecord[]>([]);
  const [users, setUsers] = useState<AdminRecord[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('');
  const [scopes, setScopes] = useState<ApiClientScope[]>(['entries:read', 'contributions:write']);
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
        name: name.trim(), description: description.trim(), userId, scopes,
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
          <div className="table-responsive"><table className="table table-striped"><thead><tr><th>Agent</th><th>Accountable user</th><th>Scopes</th><th>Use</th><th>Status</th><th>Actions</th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><strong>{client.name}</strong><div className="text-muted small"><code>{client.tokenPrefix}...</code></div></td><td>{client.accountableUser?.username || client.userId}</td><td>{client.scopes.map((scope) => <span className="label label-default" key={scope} style={{ marginRight: 3 }}>{scope}</span>)}</td><td>{client.requestCount} request(s)<div className="text-muted small">{client.lastUsedAt ? `Last used ${new Date(client.lastUsedAt).toLocaleString()}` : 'Never used'}</div></td><td><span className={`label label-${client.status === 'active' ? 'success' : 'default'}`}>{client.status}</span></td><td>{client.status === 'active' ? <><button className="btn btn-xs btn-default" type="button" onClick={() => void rotate(client)}>Rotate</button>{' '}<button className="btn btn-xs btn-danger" type="button" onClick={() => void revoke(client)}>Revoke</button></> : null}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
};

export default ApiClientsPage;
