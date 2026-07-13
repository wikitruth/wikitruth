import React, { useCallback, useEffect, useState } from 'react';
import PageMeta from '../../../components/common/PageMeta';
import LoadingSpinner from '../../../components/LoadingSpinner';
import civicApi from '../../../services/api/civic';
import type { CivicTenant, CivicTenantSection } from '../../../types/civic';

const DEFAULT_SECTIONS: CivicTenantSection[] = [
  { slug: 'people', title: 'People', description: 'Public officials and civic actors.', icon: 'users', kinds: ['person'], createKinds: ['person'], enabled: true },
  { slug: 'incidents', title: 'Incidents & Observations', description: 'Events and citizen observations.', icon: 'bolt', kinds: ['incident', 'observation'], createKinds: ['incident', 'observation'], enabled: true },
  { slug: 'projects', title: 'Projects', description: 'Public projects, budgets, contracts, and progress.', icon: 'building', kinds: ['project'], createKinds: ['project'], enabled: true },
  { slug: 'organizations', title: 'Organizations & Offices', description: 'Institutions and public offices.', icon: 'university', kinds: ['institution', 'office'], createKinds: ['institution', 'office'], enabled: true },
  { slug: 'actions', title: 'Actions', description: 'Commitments, responses, and follow-through.', icon: 'hand-paper-o', kinds: ['action'], createKinds: ['action'], enabled: true },
  { slug: 'elections', title: 'Elections', description: 'Elections and candidate comparison.', icon: 'check-square-o', kinds: ['election', 'candidate'], createKinds: ['election', 'candidate'], enabled: true },
  { slug: 'history', title: 'Public Memory', description: 'Outcomes and long-term civic history.', icon: 'history', kinds: ['history'], createKinds: ['history'], enabled: true },
];

type FormState = {
  tenantId: string; title: string; navTitle: string; countryCode: string; domains: string; slogan: string;
  status: CivicTenant['status']; locale: string; supportedLocales: string; timezone: string; currency: string;
  logoIcon: string; favicon: string; fontFamily: string; primaryColor: string; accentColor: string; surfaceColor: string;
  levels: string; addressFields: string; sections: string; featureFlags: string; extensionSchemas: string;
  moderationPolicyVersion: string; electionSystem: string; deploymentMode: CivicTenant['deploymentMode'];
};

const EMPTY_FORM: FormState = {
  tenantId: '', title: '', navTitle: '', countryCode: '', domains: '', slogan: '', status: 'active', locale: 'en', supportedLocales: 'en', timezone: 'UTC', currency: 'USD',
  logoIcon: '', favicon: '', fontFamily: '',
  primaryColor: '#1f6f50', accentColor: '#d96b27', surfaceColor: '#f5f1e8',
  levels: JSON.stringify([{ key: 'country', label: 'Country' }, { key: 'region', label: 'Region' }, { key: 'city', label: 'City' }], null, 2),
  addressFields: JSON.stringify(['region', 'city', 'address'], null, 2),
  sections: JSON.stringify(DEFAULT_SECTIONS, null, 2),
  featureFlags: JSON.stringify({ observations: true, projects: true, elections: true, knowledgeLinks: true }, null, 2),
  extensionSchemas: '{}', moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared',
};

function formFromTenant(tenant: CivicTenant): FormState {
  return {
    tenantId: tenant.tenantId, title: tenant.title, navTitle: tenant.navTitle, countryCode: tenant.countryCode, status: tenant.status,
    domains: tenant.domains.join(', '), slogan: tenant.slogan, locale: tenant.localization.defaultLocale, supportedLocales: tenant.localization.supportedLocales.join(', '),
    timezone: tenant.localization.timezone, currency: tenant.localization.currency,
    logoIcon: tenant.branding.logoIcon, favicon: tenant.branding.favicon, fontFamily: tenant.branding.fontFamily,
    primaryColor: tenant.branding.primaryColor, accentColor: tenant.branding.accentColor, surfaceColor: tenant.branding.surfaceColor,
    levels: JSON.stringify(tenant.geography.levels || [], null, 2), addressFields: JSON.stringify(tenant.geography.addressFields || [], null, 2),
    sections: JSON.stringify(tenant.sections || [], null, 2), featureFlags: JSON.stringify(tenant.featureFlags || {}, null, 2),
    extensionSchemas: JSON.stringify(tenant.extensionSchemas || {}, null, 2), moderationPolicyVersion: tenant.moderationPolicyVersion || '1',
    electionSystem: tenant.electionSystem || '', deploymentMode: tenant.deploymentMode || 'shared',
  };
}

const CivicTenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<CivicTenant[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await civicApi.platformTenants();
      setTenants(result.tenants || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load civic tenants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const levels = JSON.parse(form.levels) as CivicTenant['geography']['levels'];
      const addressFields = JSON.parse(form.addressFields) as string[];
      const sections = JSON.parse(form.sections) as CivicTenantSection[];
      const featureFlags = JSON.parse(form.featureFlags) as Record<string, boolean>;
      const extensionSchemas = JSON.parse(form.extensionSchemas) as Record<string, unknown>;
      const payload: CivicTenant = {
        tenantId: form.tenantId.trim().toLowerCase(), status: form.status, countryCode: form.countryCode.trim().toUpperCase(),
        title: form.title.trim(), navTitle: form.navTitle.trim(), slogan: form.slogan.trim(),
        domains: form.domains.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean),
        branding: { logoIcon: form.logoIcon.trim(), favicon: form.favicon.trim(), primaryColor: form.primaryColor, accentColor: form.accentColor, surfaceColor: form.surfaceColor, fontFamily: form.fontFamily.trim() },
        localization: { defaultLocale: form.locale, supportedLocales: form.supportedLocales.split(',').map((value) => value.trim()).filter(Boolean), timezone: form.timezone, currency: form.currency.toUpperCase() },
        geography: { levels, addressFields }, sections, featureFlags, extensionSchemas,
        moderationPolicyVersion: form.moderationPolicyVersion, electionSystem: form.electionSystem, deploymentMode: form.deploymentMode,
      };
      if (editing) await civicApi.updateTenant(payload.tenantId, payload);
      else await civicApi.createTenant(payload);
      setMessage(editing ? 'Tenant configuration updated.' : 'Civic tenant created.');
      setForm(EMPTY_FORM);
      setEditing(false);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save civic tenant configuration.');
    } finally {
      setSaving(false);
    }
  };

  const bootstrap = async () => {
    setMessage(null);
    try {
      const result = await civicApi.bootstrapTenants();
      setMessage(`Bootstrapped ${result.count} built-in tenant configuration.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to bootstrap built-in tenants.');
    }
  };

  return <div>
    <PageMeta title="Civic Tenants" description="Configure country and jurisdiction civic-accountability instances." />
    <div className="page-header wt-header"><h1>Civic tenants</h1><p className="text-muted">One Civic Core, independently branded and isolated country or jurisdiction instances.</p></div>
    {message && <div className="alert alert-info" role="status">{message}</div>}
    <div className="row">
      <div className="col-md-5">
        <div className="panel panel-default"><div className="panel-heading"><strong>Configured tenants</strong><button type="button" className="btn btn-default btn-xs pull-right" onClick={() => void bootstrap()}>Bootstrap built-ins</button></div><div className="panel-body">
          {loading ? <LoadingSpinner message="Loading civic tenants..." /> : tenants.length ? <div className="list-group">{tenants.map((tenant) => <button type="button" className="list-group-item" key={tenant.tenantId} onClick={() => { setForm(formFromTenant(tenant)); setEditing(true); }}><strong>{tenant.title}</strong><span className="label label-default pull-right">{tenant.countryCode}</span><small className="text-muted" style={{ display: 'block' }}>{tenant.tenantId} · {tenant.domains.join(', ')}</small></button>)}</div> : <p>No civic tenants configured.</p>}
        </div></div>
      </div>
      <div className="col-md-7"><form className="panel panel-default" onSubmit={submit}><div className="panel-heading"><strong>{editing ? `Edit ${form.tenantId}` : 'Create tenant'}</strong></div><div className="panel-body">
        <div className="row"><div className="col-sm-6 form-group"><label htmlFor="tenant-id">Tenant ID</label><input id="tenant-id" className="form-control" required pattern="[a-z0-9][a-z0-9\-]{1,62}" disabled={editing} value={form.tenantId} onChange={(event) => setField('tenantId', event.target.value)} /></div><div className="col-sm-3 form-group"><label htmlFor="country-code">Country code</label><input id="country-code" className="form-control" required minLength={2} maxLength={2} value={form.countryCode} onChange={(event) => setField('countryCode', event.target.value)} /></div><div className="col-sm-3 form-group"><label htmlFor="currency">Currency</label><input id="currency" className="form-control" required minLength={3} maxLength={3} value={form.currency} onChange={(event) => setField('currency', event.target.value)} /></div></div>
        <div className="row"><div className="col-sm-6 form-group"><label htmlFor="tenant-status">Status</label><select id="tenant-status" className="form-control" value={form.status} onChange={(event) => setField('status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="col-sm-6 form-group"><label htmlFor="tenant-deployment">Deployment mode</label><select id="tenant-deployment" className="form-control" value={form.deploymentMode} onChange={(event) => setField('deploymentMode', event.target.value)}><option value="shared">Shared</option><option value="dedicated">Dedicated</option><option value="headless">Headless</option></select></div></div>
        <div className="row"><div className="col-sm-8 form-group"><label htmlFor="tenant-title">Public title</label><input id="tenant-title" className="form-control" required value={form.title} onChange={(event) => setField('title', event.target.value)} /></div><div className="col-sm-4 form-group"><label htmlFor="tenant-nav">Navigation title</label><input id="tenant-nav" className="form-control" value={form.navTitle} onChange={(event) => setField('navTitle', event.target.value)} /></div></div>
        <div className="form-group"><label htmlFor="tenant-domains">Domains</label><input id="tenant-domains" className="form-control" required value={form.domains} onChange={(event) => setField('domains', event.target.value)} placeholder="fix.example, www.fix.example" /></div>
        <div className="form-group"><label htmlFor="tenant-slogan">Slogan / purpose</label><textarea id="tenant-slogan" className="form-control" value={form.slogan} onChange={(event) => setField('slogan', event.target.value)} /></div>
        <div className="row"><div className="col-sm-4 form-group"><label htmlFor="tenant-locale">Default locale</label><input id="tenant-locale" className="form-control" required value={form.locale} onChange={(event) => setField('locale', event.target.value)} /></div><div className="col-sm-4 form-group"><label htmlFor="tenant-locales">Supported locales</label><input id="tenant-locales" className="form-control" required value={form.supportedLocales} onChange={(event) => setField('supportedLocales', event.target.value)} placeholder="en, fil-PH" /></div><div className="col-sm-4 form-group"><label htmlFor="tenant-timezone">Timezone</label><input id="tenant-timezone" className="form-control" required value={form.timezone} onChange={(event) => setField('timezone', event.target.value)} /></div></div>
        <div className="row"><div className="col-sm-4 form-group"><label htmlFor="tenant-logo">Logo path</label><input id="tenant-logo" className="form-control" value={form.logoIcon} onChange={(event) => setField('logoIcon', event.target.value)} /></div><div className="col-sm-4 form-group"><label htmlFor="tenant-favicon">Favicon path</label><input id="tenant-favicon" className="form-control" value={form.favicon} onChange={(event) => setField('favicon', event.target.value)} /></div><div className="col-sm-4 form-group"><label htmlFor="tenant-font">Font family</label><input id="tenant-font" className="form-control" value={form.fontFamily} onChange={(event) => setField('fontFamily', event.target.value)} /></div></div>
        <div className="row"><div className="col-sm-4 form-group"><label htmlFor="tenant-primary">Primary</label><input id="tenant-primary" type="color" className="form-control" value={form.primaryColor} onChange={(event) => setField('primaryColor', event.target.value)} /></div><div className="col-sm-4 form-group"><label htmlFor="tenant-accent">Accent</label><input id="tenant-accent" type="color" className="form-control" value={form.accentColor} onChange={(event) => setField('accentColor', event.target.value)} /></div><div className="col-sm-4 form-group"><label htmlFor="tenant-surface">Surface</label><input id="tenant-surface" type="color" className="form-control" value={form.surfaceColor} onChange={(event) => setField('surfaceColor', event.target.value)} /></div></div>
        <div className="form-group"><label htmlFor="tenant-levels">Geography levels (JSON)</label><textarea id="tenant-levels" className="form-control" rows={6} required value={form.levels} onChange={(event) => setField('levels', event.target.value)} /></div>
        <div className="form-group"><label htmlFor="tenant-address-fields">Address fields (JSON)</label><textarea id="tenant-address-fields" className="form-control" rows={4} required value={form.addressFields} onChange={(event) => setField('addressFields', event.target.value)} /></div>
        <div className="form-group"><label htmlFor="tenant-sections">Sections and arrangement (JSON)</label><textarea id="tenant-sections" className="form-control" rows={12} required value={form.sections} onChange={(event) => setField('sections', event.target.value)} /></div>
        <div className="row"><div className="col-sm-6 form-group"><label htmlFor="tenant-flags">Feature flags (JSON)</label><textarea id="tenant-flags" className="form-control" rows={7} required value={form.featureFlags} onChange={(event) => setField('featureFlags', event.target.value)} /></div><div className="col-sm-6 form-group"><label htmlFor="tenant-extensions">Extension schemas (JSON)</label><textarea id="tenant-extensions" className="form-control" rows={7} required value={form.extensionSchemas} onChange={(event) => setField('extensionSchemas', event.target.value)} /></div></div>
        <div className="row"><div className="col-sm-6 form-group"><label htmlFor="tenant-policy">Moderation policy version</label><input id="tenant-policy" className="form-control" required value={form.moderationPolicyVersion} onChange={(event) => setField('moderationPolicyVersion', event.target.value)} /></div><div className="col-sm-6 form-group"><label htmlFor="tenant-election">Election system</label><input id="tenant-election" className="form-control" value={form.electionSystem} onChange={(event) => setField('electionSystem', event.target.value)} /></div></div>
      </div><div className="panel-footer"><button className="btn btn-primary" disabled={saving} type="submit">{saving ? 'Saving...' : editing ? 'Update tenant' : 'Create tenant'}</button>{editing && <button className="btn btn-link" type="button" onClick={() => { setEditing(false); setForm(EMPTY_FORM); }}>Cancel</button>}</div></form></div>
    </div>
  </div>;
};

export default CivicTenantsPage;
