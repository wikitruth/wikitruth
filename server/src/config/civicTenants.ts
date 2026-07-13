import type { CivicTenantDefinition } from '../types/civicTenancy';

export const FIXPH_TENANT: CivicTenantDefinition = {
  tenantId: 'fixtheph',
  status: 'active',
  countryCode: 'PH',
  title: 'Fix The Philippines',
  navTitle: 'FixPH',
  slogan: 'Promote transparency and accountability through a public civic record.',
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
  extensionSchemas: {},
  moderationPolicyVersion: '1',
  electionSystem: 'plurality-and-country-defined',
  deploymentMode: 'shared',
};

export const BUILT_IN_CIVIC_TENANTS: CivicTenantDefinition[] = [FIXPH_TENANT];

export function builtInCivicTenant(tenantId: string): CivicTenantDefinition | null {
  const normalized = String(tenantId || '').trim().toLowerCase();
  return BUILT_IN_CIVIC_TENANTS.find((tenant) => tenant.tenantId === normalized) || null;
}

export function builtInCivicTenantForHost(hostname: string): CivicTenantDefinition | null {
  const normalized = (String(hostname || '').split(':')[0] || '').trim().toLowerCase();
  return BUILT_IN_CIVIC_TENANTS.find((tenant) => tenant.domains.includes(normalized)) || null;
}
