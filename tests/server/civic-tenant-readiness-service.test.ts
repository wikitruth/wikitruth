const membershipCount = jest.fn();
const jurisdictionCount = jest.fn();
const tenantFindOne = jest.fn();
const topicFindOne = jest.fn();

function query(value: unknown) {
  const chain = { select: jest.fn(() => chain), lean: jest.fn(async () => value) };
  return chain;
}

jest.mock('../../server/src/app', () => ({ db: { models: {
  TenantMembership: { countDocuments: (...args: unknown[]) => membershipCount(...args) },
  Jurisdiction: { countDocuments: (...args: unknown[]) => jurisdictionCount(...args) },
  CivicTenant: { findOne: (...args: unknown[]) => tenantFindOne(...args) },
  Topic: { findOne: (...args: unknown[]) => topicFindOne(...args) },
} } }));

import type { CivicTenantDefinition } from '../../server/src/types/civicTenancy';
import {
  buildTenantConfigurationPreview,
  buildTenantConfigurationReadiness,
  buildTenantLaunchReadiness,
  portableTenantConfiguration,
} from '../../server/src/services/civicTenantReadinessService';

const tenant: CivicTenantDefinition = {
  tenantId: 'fix-example', status: 'active', countryCode: 'XZ', title: 'Fix Example', navTitle: 'FixXZ',
  slogan: 'A public accountability record.',
  site: { homeTitle: 'Fix Example', homeDescription: 'Public records.', aboutUrl: '/civic', exploreUrl: '/explore', knowledgeRootTopicId: '507f1f77bcf86cd799439011' },
  domains: ['fix.example'],
  branding: { logoIcon: '/logo.png', favicon: '/favicon.ico', primaryColor: '#123456', accentColor: '#ba2d2d', surfaceColor: '#f5f1e8', fontFamily: 'Georgia' },
  localization: { defaultLocale: 'en-XZ', supportedLocales: ['en-XZ'], timezone: 'UTC', currency: 'XZD' },
  geography: { levels: [{ key: 'district', label: 'District' }], addressFields: ['district', 'address'] },
  sections: [{ slug: 'people', title: 'People', description: '', icon: 'users', kinds: ['person'], createKinds: ['person'], enabled: true }],
  featureFlags: {}, extensionSchemas: {}, moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared',
};

describe('civic tenant launch readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    membershipCount.mockResolvedValue(1);
    jurisdictionCount.mockResolvedValue(4);
    tenantFindOne.mockReturnValue(query(null));
    topicFindOne.mockReturnValue(query({ _id: tenant.site.knowledgeRootTopicId, title: 'Example country' }));
  });

  it('builds a reusable branded preview for a valid configuration', () => {
    const preview = buildTenantConfigurationPreview(tenant);
    expect(preview.readiness.ready).toBe(true);
    expect(preview.presentation.cssVariables['--civic-primary']).toBe('#123456');
    expect(preview.presentation.navigation).toEqual([expect.objectContaining({ title: 'People' })]);
  });

  it('fails closed on operational launch blockers', async () => {
    membershipCount.mockResolvedValue(0);
    jurisdictionCount.mockResolvedValue(0);
    topicFindOne.mockReturnValue(query(null));
    const readiness = await buildTenantLaunchReadiness(tenant);
    expect(readiness.ready).toBe(false);
    expect(readiness.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'tenant_admin', status: 'fail' }),
      expect.objectContaining({ key: 'jurisdictions', status: 'fail' }),
      expect.objectContaining({ key: 'knowledge_root', status: 'fail' }),
    ]));
  });

  it('exports only the portable tenant contract and readiness evidence', async () => {
    const readiness = await buildTenantLaunchReadiness(tenant);
    const exported = portableTenantConfiguration(tenant, readiness);
    expect(exported).toEqual(expect.objectContaining({ format: 'wikitruth.civic-tenant', version: '1.0', tenant }));
    expect(exported).not.toHaveProperty('_id');
    expect(JSON.stringify(exported)).not.toMatch(/createUserId|editUserId|password|secret/i);
  });

  it('rejects invalid locale and geography configuration', () => {
    const readiness = buildTenantConfigurationReadiness({
      ...tenant,
      localization: { ...tenant.localization, defaultLocale: 'not_a_locale' },
      geography: { levels: tenant.geography.levels, addressFields: ['province'] },
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'localization', status: 'fail' }),
      expect.objectContaining({ key: 'geography', status: 'fail' }),
    ]));
  });
});
