import React, { useCallback, useEffect, useState } from 'react';
import PageMeta from '../../../components/common/PageMeta';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useCivicTenant } from '../../../context/CivicTenantContext';
import civicApi from '../../../services/api/civic';
import type {
  CivicJurisdiction,
  CivicMembershipUser,
  CivicTenantMembership,
  CivicTenantRole,
} from '../../../types/civic';

const TENANT_ROLES: CivicTenantRole[] = ['reader', 'contributor', 'screener', 'reviewer', 'admin'];

type JurisdictionForm = {
  id: string;
  code: string;
  levelKey: string;
  name: string;
  parentId: string;
  metadata: string;
};

const emptyJurisdiction = (levelKey: string): JurisdictionForm => ({
  id: '', code: '', levelKey, name: '', parentId: '', metadata: '{}',
});

function userLabel(user?: CivicMembershipUser | null, userId?: string): string {
  if (!user) return userId || 'Unknown user';
  return user.email ? `${user.username} (${user.email})` : user.username;
}

const CivicOperationsPage: React.FC = () => {
  const { tenant, actor, jurisdictions, hasRole, refreshJurisdictions } = useCivicTenant();
  const [memberships, setMemberships] = useState<CivicTenantMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<CivicMembershipUser[]>([]);
  const [memberUser, setMemberUser] = useState<CivicMembershipUser | null>(null);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRoles, setMemberRoles] = useState<CivicTenantRole[]>(['reader']);
  const [memberActive, setMemberActive] = useState(true);
  const [savingMember, setSavingMember] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionForm>(() => emptyJurisdiction(tenant.geography.levels[0]?.key || 'country'));
  const [savingJurisdiction, setSavingJurisdiction] = useState(false);
  const pageTitle = `${tenant.navTitle || tenant.title} operations`;

  const operationsHeader = <>
    <PageMeta title={pageTitle} description="Manage tenant membership and jurisdiction hierarchy." />
    <div className="page-header wt-header">
      <span className="wt-civic-kicker">Tenant administration</span>
      <h1>{tenant.title} operations</h1>
      <p className="text-muted">Manage tenant-scoped access and the geography hierarchy for <code>{tenant.tenantId}</code>.</p>
    </div>
  </>;

  const loadMemberships = useCallback(async () => {
    const result = await civicApi.adminMemberships();
    setMemberships(result.memberships || []);
  }, []);

  useEffect(() => {
    if (!hasRole('admin')) {
      setLoading(false);
      return;
    }
    void loadMemberships()
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load tenant memberships.'))
      .finally(() => setLoading(false));
  }, [hasRole, loadMemberships]);

  const resetMembership = () => {
    setMemberUser(null);
    setMemberUserId('');
    setMemberRoles(['reader']);
    setMemberActive(true);
    setCandidates([]);
    setSearch('');
  };

  const findCandidates = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      const result = await civicApi.searchMembershipCandidates(search);
      setCandidates(result.users || []);
      if (!result.users?.length) setMessage('No active users matched that search.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to search users.');
    }
  };

  const editMembership = (membership: CivicTenantMembership) => {
    setMemberUser(membership.user || null);
    setMemberUserId(String(membership.userId));
    setMemberRoles(membership.roles);
    setMemberActive(membership.active);
    setCandidates([]);
  };

  const toggleRole = (role: CivicTenantRole) => {
    setMemberRoles((current) => current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role]);
  };

  const saveMembership = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memberUserId || !memberRoles.length) return;
    setSavingMember(true);
    setMessage(null);
    try {
      await civicApi.updateMembership(memberUserId, { roles: memberRoles, active: memberActive });
      await loadMemberships();
      setMessage(`Tenant access updated for ${userLabel(memberUser, memberUserId)}.`);
      resetMembership();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update tenant access.');
    } finally {
      setSavingMember(false);
    }
  };

  const editJurisdiction = (item: CivicJurisdiction) => {
    setJurisdiction({
      id: item._id,
      code: item.code,
      levelKey: item.levelKey,
      name: item.name,
      parentId: item.parentId || '',
      metadata: JSON.stringify(item.metadata || {}, null, 2),
    });
  };

  const resetJurisdiction = () => setJurisdiction(emptyJurisdiction(tenant.geography.levels[0]?.key || 'country'));

  const saveJurisdiction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingJurisdiction(true);
    setMessage(null);
    try {
      const payload = {
        code: jurisdiction.code.trim(),
        levelKey: jurisdiction.levelKey,
        name: jurisdiction.name.trim(),
        parentId: jurisdiction.parentId || undefined,
        metadata: JSON.parse(jurisdiction.metadata) as Record<string, unknown>,
      };
      if (jurisdiction.id) await civicApi.updateJurisdiction(jurisdiction.id, payload);
      else await civicApi.createJurisdiction(payload);
      await refreshJurisdictions();
      setMessage(jurisdiction.id ? 'Jurisdiction updated.' : 'Jurisdiction created.');
      resetJurisdiction();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save jurisdiction.');
    } finally {
      setSavingJurisdiction(false);
    }
  };

  const deactivateJurisdiction = async (item: CivicJurisdiction) => {
    if (!window.confirm(`Deactivate ${item.name}? Existing records will retain their jurisdiction reference.`)) return;
    setMessage(null);
    try {
      await civicApi.deactivateJurisdiction(item._id);
      await refreshJurisdictions();
      if (jurisdiction.id === item._id) resetJurisdiction();
      setMessage(`${item.name} was deactivated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to deactivate jurisdiction.');
    }
  };

  if (!actor.authenticated) return <div className="wt-civic-operations">{operationsHeader}<div className="alert alert-warning">Sign in to administer this civic tenant.</div></div>;
  if (!hasRole('admin')) return <div className="wt-civic-operations">{operationsHeader}<div className="alert alert-danger">Tenant administrator privileges are required.</div></div>;
  if (loading) return <LoadingSpinner message="Loading civic tenant operations..." />;

  return <div className="wt-civic-operations">
    {operationsHeader}
    {message && <div className="alert alert-info" role="status">{message}</div>}
    <div className="row">
      <section className="col-lg-6">
        <div className="panel panel-default">
          <div className="panel-heading"><strong>Tenant memberships</strong></div>
          <div className="panel-body">
            <form onSubmit={findCandidates} className="form-inline" style={{ marginBottom: 16 }}>
              <div className="form-group"><label className="sr-only" htmlFor="civic-member-search">Find a user</label><input id="civic-member-search" className="form-control" minLength={2} required value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or email" /></div>{' '}
              <button className="btn btn-default" type="submit">Search users</button>
            </form>
            {candidates.length > 0 && <div className="list-group" aria-label="User search results">{candidates.map((candidate) => <button className="list-group-item" key={candidate._id} type="button" onClick={() => { setMemberUser(candidate); setMemberUserId(candidate._id); setCandidates([]); }}>{userLabel(candidate)}</button>)}</div>}
            <form onSubmit={saveMembership}>
              <div className="form-group"><label>Selected user</label><p className="form-control-static">{memberUserId ? userLabel(memberUser, memberUserId) : 'Search for a user or edit an existing membership.'}</p></div>
              <fieldset disabled={!memberUserId || savingMember}><legend className="h5">Tenant roles</legend>{TENANT_ROLES.map((role) => <label className="checkbox-inline" key={role}><input type="checkbox" checked={memberRoles.includes(role)} onChange={() => toggleRole(role)} /> {role}</label>)}</fieldset>
              <div className="checkbox"><label><input type="checkbox" checked={memberActive} disabled={!memberUserId || savingMember} onChange={(event) => setMemberActive(event.target.checked)} /> Active membership</label></div>
              <button className="btn btn-primary" disabled={!memberUserId || !memberRoles.length || savingMember} type="submit">{savingMember ? 'Saving...' : 'Save tenant access'}</button>{memberUserId && <button className="btn btn-link" type="button" onClick={resetMembership}>Cancel</button>}
            </form>
          </div>
          <div className="list-group" style={{ marginBottom: 0 }}>{memberships.length ? memberships.map((membership) => <button className="list-group-item" type="button" key={membership._id} onClick={() => editMembership(membership)}><strong>{userLabel(membership.user, membership.userId)}</strong><span className={`label ${membership.active ? 'label-success' : 'label-default'} pull-right`}>{membership.active ? 'active' : 'inactive'}</span><small className="text-muted" style={{ display: 'block' }}>{membership.roles.join(', ')}</small></button>) : <div className="list-group-item text-muted">No explicit tenant memberships yet.</div>}</div>
        </div>
      </section>
      <section className="col-lg-6">
        <form className="panel panel-default" onSubmit={saveJurisdiction}>
          <div className="panel-heading"><strong>{jurisdiction.id ? `Edit ${jurisdiction.name}` : 'Add jurisdiction'}</strong></div>
          <div className="panel-body">
            <div className="row"><div className="col-sm-4 form-group"><label htmlFor="jurisdiction-code">Code</label><input id="jurisdiction-code" className="form-control" required value={jurisdiction.code} onChange={(event) => setJurisdiction((current) => ({ ...current, code: event.target.value }))} /></div><div className="col-sm-8 form-group"><label htmlFor="jurisdiction-name">Name</label><input id="jurisdiction-name" className="form-control" required value={jurisdiction.name} onChange={(event) => setJurisdiction((current) => ({ ...current, name: event.target.value }))} /></div></div>
            <div className="row"><div className="col-sm-6 form-group"><label htmlFor="jurisdiction-level">Level</label><select id="jurisdiction-level" className="form-control" value={jurisdiction.levelKey} onChange={(event) => setJurisdiction((current) => ({ ...current, levelKey: event.target.value }))}>{tenant.geography.levels.map((level) => <option key={level.key} value={level.key}>{level.label}</option>)}</select></div><div className="col-sm-6 form-group"><label htmlFor="jurisdiction-parent">Parent</label><select id="jurisdiction-parent" className="form-control" value={jurisdiction.parentId} onChange={(event) => setJurisdiction((current) => ({ ...current, parentId: event.target.value }))}><option value="">No parent</option>{jurisdictions.filter((item) => item._id !== jurisdiction.id).map((item) => <option value={item._id} key={item._id}>{item.name}</option>)}</select></div></div>
            <div className="form-group"><label htmlFor="jurisdiction-metadata">Metadata (JSON)</label><textarea id="jurisdiction-metadata" className="form-control" rows={5} required value={jurisdiction.metadata} onChange={(event) => setJurisdiction((current) => ({ ...current, metadata: event.target.value }))} /></div>
          </div>
          <div className="panel-footer"><button className="btn btn-primary" disabled={savingJurisdiction} type="submit">{savingJurisdiction ? 'Saving...' : jurisdiction.id ? 'Update jurisdiction' : 'Create jurisdiction'}</button>{jurisdiction.id && <button className="btn btn-link" type="button" onClick={resetJurisdiction}>Cancel</button>}</div>
        </form>
        <div className="panel panel-default"><div className="panel-heading"><strong>Active jurisdictions</strong></div><div className="list-group" style={{ marginBottom: 0 }}>{jurisdictions.length ? jurisdictions.map((item) => <div className="list-group-item" key={item._id}><strong>{item.name}</strong><span className="label label-default pull-right">{item.levelKey}</span><small className="text-muted" style={{ display: 'block' }}>{item.code}</small><div style={{ marginTop: 8 }}><button className="btn btn-default btn-xs" type="button" onClick={() => editJurisdiction(item)}>Edit</button>{' '}<button className="btn btn-danger btn-xs" type="button" onClick={() => void deactivateJurisdiction(item)}>Deactivate</button></div></div>) : <div className="list-group-item text-muted">No jurisdictions configured.</div>}</div></div>
      </section>
    </div>
  </div>;
};

export default CivicOperationsPage;
