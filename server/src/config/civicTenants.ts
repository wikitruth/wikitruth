import type { CivicTenantDefinition } from '../types/civicTenancy';

export const FIXPH_TENANT: CivicTenantDefinition = {
  tenantId: 'fixtheph',
  status: 'active',
  countryCode: 'PH',
  title: 'Fix The Philippines',
  navTitle: 'FixPH',
  slogan: 'Promote transparency and accountability through a public civic record.',
  site: {
    homeTitle: "Let's Fix The Philippines",
    homeDescription: 'A system to promote transparency and accountability, help citizens identify, raise and fix issues in the Philippine society and government.',
    aboutUrl: '/civic',
    exploreUrl: '/explore',
    knowledgeRootTopicId: '57aa74e0b663fb1072c7766d',
  },
  domains: ['fixthephilippines.org', 'www.fixthephilippines.org'],
  branding: {
    logoIcon: '/img/fixtheph/logo-64x64.png',
    favicon: '/img/fixtheph/favicons/favicon.ico',
    primaryColor: '#2f6b4f',
    accentColor: '#d96b27',
    surfaceColor: '#f4f0e5',
    fontFamily: '',
  },
  localization: {
    defaultLocale: 'en-PH',
    supportedLocales: ['en-PH', 'fil-PH'],
    timezone: 'Asia/Manila',
    currency: 'PHP',
  },
  geography: {
    levels: [
      { key: 'country', label: 'Country' },
      { key: 'region', label: 'Region' },
      { key: 'province', label: 'Province' },
      { key: 'city', label: 'City / municipality' },
      { key: 'barangay', label: 'Barangay' },
    ],
    addressFields: ['region', 'province', 'city', 'barangay', 'address'],
  },
  sections: [
    { slug: 'people', title: 'People', description: 'Connect public officials and civic actors to responsibilities and outcomes.', icon: 'users', kinds: ['person'], createKinds: ['person'], enabled: true },
    { slug: 'incidents', title: 'Incidents & Observations', description: 'Report, verify, escalate, and resolve events that affect the public.', icon: 'bolt', kinds: ['incident', 'observation'], createKinds: ['incident', 'observation'], enabled: true },
    { slug: 'projects', title: 'Projects', description: 'Track budgets, contracts, officials, evidence, timelines, and delivery.', icon: 'building', kinds: ['project'], createKinds: ['project'], enabled: true },
    { slug: 'organizations', title: 'Organizations & Offices', description: 'Map institutions, offices, and their public responsibilities.', icon: 'university', kinds: ['institution', 'office'], createKinds: ['institution', 'office'], enabled: true },
    { slug: 'actions', title: 'Actions', description: 'Track commitments, public responses, citizen initiatives, and follow-through.', icon: 'hand-paper-o', kinds: ['action'], createKinds: ['action'], enabled: true },
    { slug: 'elections', title: 'Vote Wisely', description: 'Compare candidates using public-service history, platforms, and evidence.', icon: 'check-square-o', kinds: ['election', 'candidate'], createKinds: ['election', 'candidate'], enabled: true },
    { slug: 'history', title: 'Public Memory', description: 'Connect incidents and promises to later actions and documented outcomes.', icon: 'history', kinds: ['history'], createKinds: ['history'], enabled: true },
  ],
  featureFlags: {
    observations: true,
    projects: true,
    elections: true,
    knowledgeLinks: true,
  },
  extensionSchemas: {
    project: {
      title: 'Philippine project details',
      description: 'Optional public-procurement context configured specifically for FixPH.',
      fields: [
        { key: 'funding_source', label: 'Funding source', type: 'text', maxLength: 180 },
        {
          key: 'procurement_method', label: 'Procurement method', type: 'select',
          options: [
            { value: 'public_bidding', label: 'Public bidding' },
            { value: 'alternative_method', label: 'Alternative procurement method' },
            { value: 'not_recorded', label: 'Not yet recorded' },
          ],
        },
      ],
    },
    observation: {
      title: 'Local reporting details',
      fields: [
        { key: 'report_reference', label: 'Barangay or agency report reference', type: 'text', maxLength: 120 },
      ],
    },
    candidate: {
      title: 'Candidate context',
      fields: [
        { key: 'political_affiliation', label: 'Political affiliation', type: 'text', maxLength: 180 },
      ],
    },
  },
  moderationPolicyVersion: '1',
  electionSystem: 'plurality-and-country-defined',
  deploymentMode: 'shared',
};

export const BUILT_IN_CIVIC_TENANTS: CivicTenantDefinition[] = [FIXPH_TENANT];

function normalizeHost(value: unknown): string {
  const firstHost = String(value || '').split(',')[0] || '';
  return firstHost.trim().toLowerCase().split(':')[0] || '';
}

export function normalizeCivicTenant(raw: Record<string, any>): CivicTenantDefinition {
  const fallback = builtInCivicTenant(String(raw.tenantId || ''));
  return {
    ...(fallback || {}),
    ...raw,
    tenantId: String(raw.tenantId || fallback?.tenantId || '').trim().toLowerCase(),
    status: raw.status || fallback?.status || 'active',
    countryCode: String(raw.countryCode || fallback?.countryCode || '').trim().toUpperCase(),
    domains: Array.isArray(raw.domains) ? raw.domains.map(normalizeHost).filter(Boolean) : (fallback?.domains || []),
    site: { ...(fallback?.site || {}), ...(raw.site || {}) },
    branding: { ...(fallback?.branding || {}), ...(raw.branding || {}) },
    localization: { ...(fallback?.localization || {}), ...(raw.localization || {}) },
    geography: { ...(fallback?.geography || {}), ...(raw.geography || {}) },
    sections: Array.isArray(raw.sections) && raw.sections.length ? raw.sections : (fallback?.sections || []),
    featureFlags: { ...(fallback?.featureFlags || {}), ...(raw.featureFlags || {}) },
    extensionSchemas: { ...(fallback?.extensionSchemas || {}), ...(raw.extensionSchemas || {}) },
    moderationPolicyVersion: String(raw.moderationPolicyVersion || fallback?.moderationPolicyVersion || '1'),
    electionSystem: String(raw.electionSystem || fallback?.electionSystem || ''),
    deploymentMode: raw.deploymentMode || fallback?.deploymentMode || 'shared',
  } as CivicTenantDefinition;
}

export function publicCivicTenantDefinition(raw: Record<string, any>): CivicTenantDefinition {
  const tenant = normalizeCivicTenant(raw);
  return {
    tenantId: tenant.tenantId,
    status: tenant.status,
    countryCode: tenant.countryCode,
    title: tenant.title,
    navTitle: tenant.navTitle,
    slogan: tenant.slogan,
    site: tenant.site,
    domains: tenant.domains,
    branding: tenant.branding,
    localization: tenant.localization,
    geography: tenant.geography,
    sections: tenant.sections,
    featureFlags: tenant.featureFlags,
    extensionSchemas: tenant.extensionSchemas,
    moderationPolicyVersion: tenant.moderationPolicyVersion,
    electionSystem: tenant.electionSystem,
    deploymentMode: tenant.deploymentMode,
  };
}

export function builtInCivicTenant(tenantId: string): CivicTenantDefinition | null {
  const normalized = String(tenantId || '').trim().toLowerCase();
  return BUILT_IN_CIVIC_TENANTS.find((tenant) => tenant.tenantId === normalized) || null;
}

export function builtInCivicTenantForHost(hostname: string): CivicTenantDefinition | null {
  const normalized = normalizeHost(hostname);
  return BUILT_IN_CIVIC_TENANTS.find((tenant) => tenant.domains.includes(normalized)) || null;
}
