import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';

import adminApi, { type AdminDashboardResponse, type AdminPermission, type AdminSystemHealth, type HealthStatus } from '../../services/api/admin';
import { createRealtimeChannel } from '../../services/realtime';
import type { RealtimeConnectionState, RealtimeEvent } from '../../types/realtime';
import AdminOperationsShell from './common/AdminOperationsShell';

type OperationLink = { label: string; to: string; permission: AdminPermission };
type OperationGroup = { title: string; description: string; icon: string; links: OperationLink[] };

const operationGroups: OperationGroup[] = [
  { title: 'People', description: 'Review users, spam signals, roles, and account security.', icon: 'users', links: [
    { label: 'People operations', to: '/admin/people', permission: 'users.manage' },
    { label: 'Accounts', to: '/admin/accounts', permission: 'users.manage' },
    { label: 'Administrators & permissions', to: '/admin/administrators', permission: 'security.manage' },
  ] },
  { title: 'Content & moderation', description: 'Resolve review queues and maintain shared content policy.', icon: 'check-square-o', links: [
    { label: 'Knowledge health', to: '/admin/knowledge-health', permission: 'moderation.review' },
    { label: 'Verdict queue', to: '/admin/verdicts', permission: 'moderation.review' },
    { label: 'Signals & appeals', to: '/admin/moderation/signals', permission: 'moderation.review' },
    { label: 'Anonymous contributions', to: '/admin/anonymous-contributions', permission: 'moderation.review' },
  ] },
  { title: 'Security', description: 'Manage accountable credentials and inspect privileged activity.', icon: 'shield', links: [
    { label: 'Agent API credentials', to: '/admin/api-clients', permission: 'security.manage' },
    { label: 'Privileged audit', to: '/admin/audit', permission: 'audit.read' },
    { label: 'Admin groups', to: '/admin/groups', permission: 'security.manage' },
  ] },
  { title: 'Communications', description: 'Configure providers, preview templates, and inspect delivery.', icon: 'envelope-o', links: [
    { label: 'Email operations', to: '/admin/email-operations', permission: 'email.manage' },
  ] },
  { title: 'Tenants', description: 'Operate branded civic instances and jurisdiction workflows.', icon: 'building-o', links: [
    { label: 'Civic tenants', to: '/admin/civic-tenants', permission: 'tenants.manage' },
    { label: 'Current tenant operations', to: '/admin/civic-operations', permission: 'tenants.manage' },
  ] },
  { title: 'System operations', description: 'Review runtime health and create verified recovery snapshots.', icon: 'server', links: [
    { label: 'Health & backups', to: '/admin/system-operations', permission: 'system.read' },
    { label: 'Categories', to: '/admin/categories', permission: 'content.manage' },
    { label: 'Statuses', to: '/admin/statuses', permission: 'content.manage' },
  ] },
];

function stateLabel(status: HealthStatus): string {
  return status === 'healthy' ? 'Healthy' : status === 'attention' ? 'Needs attention'
    : status === 'unavailable' ? 'Unavailable' : 'Not yet measured';
}

const AdminDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>('disconnected');
  const [recentEvents, setRecentEvents] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [dashboardResult, healthResult] = await Promise.allSettled([
        adminApi.dashboard(), adminApi.systemHealth(),
      ]);
      if (!active) return;
      if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
      else setError(dashboardResult.reason instanceof Error ? dashboardResult.reason.message : 'Failed to load admin operations');
      if (healthResult.status === 'fulfilled') setHealth(healthResult.value.health);
      setIsLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const channel = createRealtimeChannel({
      onStateChange: setRealtimeState,
      onEvent: (event) => setRecentEvents((events) => [event, ...events].slice(0, 3)),
    });
    channel.connect();
    return () => channel.disconnect();
  }, []);

  const permissions = dashboard?.authorization.effectivePermissions || [];
  const has = (permission: AdminPermission) => permissions.includes('admin.access') || permissions.includes(permission);
  const groups = operationGroups.map((group) => ({
    ...group, links: group.links.filter((link) => has(link.permission)),
  })).filter((group) => group.links.length);
  const queues = dashboard?.queues;
  const systemState = health?.overall || 'unknown';
  const urgent = [
    ...(queues?.quarantined ? [{ label: 'Quarantined accounts', area: 'People', status: 'Action required', count: queues.quarantined, to: '/admin/people?state=quarantined', permission: 'users.manage' as AdminPermission }] : []),
    ...(queues?.emailFailed ? [{ label: 'Failed email deliveries', area: 'Communications', status: 'Needs review', count: queues.emailFailed, to: '/admin/email-operations', permission: 'email.manage' as AdminPermission }] : []),
    ...(queues?.notificationFailed ? [{ label: 'Failed notification deliveries', area: 'Communications', status: 'Needs review', count: queues.notificationFailed, to: '/admin/email-operations', permission: 'email.manage' as AdminPermission }] : []),
    ...(systemState === 'attention' || systemState === 'unavailable' ? [{ label: 'System health', area: 'System operations', status: stateLabel(systemState), count: null, to: '/admin/system-operations', permission: 'system.read' as AdminPermission }] : []),
  ].filter((item) => has(item.permission));

  return (
    <AdminOperationsShell
      title="Admin operations"
      description="Monitor platform health, manage operational queues, and take safe action from one place."
      actions={<span className="text-muted"><i className="fa fa-refresh" aria-hidden="true" /> Updated {dashboard ? 'just now' : '—'}</span>}
    >
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {isLoading ? <p className="text-muted"><i className="fa fa-spinner fa-spin" aria-hidden="true" /> Loading operations…</p> : null}
      {dashboard ? (
        <>
          <section className="wt-admin-status-strip" aria-label="Operational status">
            {has('users.manage') ? <Link className="wt-admin-status-item" to="/admin/people?state=needs_review">
              <span className="wt-admin-status-icon"><i className="fa fa-user-times" aria-hidden="true" /></span>
              <span className="wt-admin-status-copy"><strong>Quarantined accounts</strong><span className={`wt-admin-state ${queues?.quarantined ? 'attention' : 'healthy'}`}>{queues?.quarantined || 0} account{queues?.quarantined === 1 ? '' : 's'}</span><small>Restricted accounts awaiting an operator decision.</small></span>
            </Link> : null}
            {has('email.manage') ? <Link className="wt-admin-status-item" to="/admin/email-operations">
              <span className="wt-admin-status-icon"><i className="fa fa-envelope-o" aria-hidden="true" /></span>
              <span className="wt-admin-status-copy"><strong>Email outbox</strong><span className={`wt-admin-state ${queues?.emailFailed ? 'attention' : 'healthy'}`}>{queues?.emailFailed ? `${queues.emailFailed} failed` : `${queues?.emailQueued || 0} queued`}</span><small>Provider delivery, retry, and template operations.</small></span>
            </Link> : null}
            {has('system.read') ? <Link className="wt-admin-status-item" to="/admin/system-operations">
              <span className="wt-admin-status-icon"><i className="fa fa-heartbeat" aria-hidden="true" /></span>
              <span className="wt-admin-status-copy"><strong>System health</strong><span className={`wt-admin-state ${systemState}`}>{stateLabel(systemState)}</span><small>{health?.components.mongo?.summary || 'Open health to run measured checks.'}</small></span>
            </Link> : null}
            <div className="wt-admin-status-item">
              <span className="wt-admin-status-icon"><i className="fa fa-rss" aria-hidden="true" /></span>
              <span className="wt-admin-status-copy"><strong>Realtime channel</strong><span className={`wt-admin-state ${realtimeState === 'connected' ? 'healthy' : realtimeState === 'error' ? 'attention' : 'unknown'}`}>{realtimeState}</span><small>{recentEvents.length ? `${recentEvents.length} recent event${recentEvents.length === 1 ? '' : 's'}` : 'Waiting for operational events.'}</small></span>
            </div>
          </section>

          <section className="wt-admin-section">
            <header className="wt-admin-section-header"><div><h2>Urgent actions</h2><p>Only measured queues that currently need attention appear here.</p></div></header>
            <div className="wt-admin-section-body flush">
              {urgent.length ? <table className="wt-admin-table responsive">
                <thead><tr><th>Item</th><th>Area</th><th>Status</th><th>Count</th><th><span className="sr-only">Action</span></th></tr></thead>
                <tbody>{urgent.map((item) => <tr key={item.label}>
                  <td data-label="Item"><Link to={item.to}>{item.label}</Link></td>
                  <td data-label="Area">{item.area}</td>
                  <td data-label="Status"><span className="wt-admin-state attention">{item.status}</span></td>
                  <td data-label="Count">{item.count ?? '—'}</td>
                  <td data-label="Action"><Link className="btn btn-default btn-xs" to={item.to}>Review</Link></td>
                </tr>)}</tbody>
              </table> : <div className="wt-admin-section-body"><span className="wt-admin-state healthy"><i className="fa fa-check-circle" aria-hidden="true" /> No measured queues require action</span></div>}
            </div>
          </section>

          <section className="wt-admin-section">
            <header className="wt-admin-section-header"><div><h2>Operations by area</h2><p>Destinations are filtered to your effective administrator permissions.</p></div></header>
            <div className="wt-admin-operation-groups">{groups.map((group) => <article className="wt-admin-operation-group" key={group.title}>
              <h3><i className={`fa fa-${group.icon}`} aria-hidden="true" /> {group.title}</h3>
              <p>{group.description}</p>
              <div className="wt-admin-operation-links">{group.links.map((link) => <Link key={link.to} to={link.to}>{link.label}<i className="fa fa-angle-right" aria-hidden="true" /></Link>)}</div>
            </article>)}</div>
          </section>

          <p className="wt-admin-safe-note"><i className="fa fa-shield" aria-hidden="true" /> Administrator actions are permission checked, require passkey step-up where configured, and are recorded in the privileged audit chain.</p>
        </>
      ) : null}
    </AdminOperationsShell>
  );
};

export default AdminDashboard;
