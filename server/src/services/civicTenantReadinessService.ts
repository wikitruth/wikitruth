import appModForDb from '../app';
import constants from '../models/constants';
import type { CivicTenantDefinition } from '../types/civicTenancy';

type CheckStatus = 'pass' | 'warning' | 'fail';
export interface CivicTenantReadinessCheck {
  key: string;
  label: string;
  status: CheckStatus;
  message: string;
}
export interface CivicTenantReadinessReport {
  tenantId: string;
  scope: 'configuration' | 'launch';
  ready: boolean;
  generatedAt: string;
  checks: CivicTenantReadinessCheck[];
  summary: { passed: number; warnings: number; failed: number };
}

type CountModel = { countDocuments: (query: Record<string, unknown>) => Promise<number> };
type FindModel = {
  findOne: (query: Record<string, unknown>) => { select: (fields: string) => { lean: () => Promise<unknown> } };
};
const db = (appModForDb as unknown as { db: { models: Record<string, CountModel | FindModel | undefined> } }).db.models;

function check(key: string, label: string, status: CheckStatus, message: string): CivicTenantReadinessCheck {
  return { key, label, status, message };
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function validLocale(locale: string): boolean {
  try {
    return Intl.getCanonicalLocales(locale).length === 1;
  } catch {
    return false;
  }
}

function validDomain(domain: string): boolean {
  return domain === 'localhost' || /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain);
}

function configurationChecks(tenant: CivicTenantDefinition): CivicTenantReadinessCheck[] {
  const localeSet = new Set(tenant.localization.supportedLocales.map((value) => value.toLowerCase()));
  const levelKeys = tenant.geography.levels.map((level) => level.key);
  const sectionSlugs = tenant.sections.map((section) => section.slug);
  const enabledSections = tenant.sections.filter((section) => section.enabled);
  const invalidCreateKinds = tenant.sections.flatMap((section) => section.createKinds.filter((kind) => !section.kinds.includes(kind)));
  const domainsValid = tenant.domains.length > 0 && tenant.domains.every(validDomain) && new Set(tenant.domains).size === tenant.domains.length;
  const localesValid = tenant.localization.supportedLocales.length > 0
    && tenant.localization.supportedLocales.every(validLocale)
    && validLocale(tenant.localization.defaultLocale)
    && localeSet.has(tenant.localization.defaultLocale.toLowerCase());
  const navigationValid = Boolean(tenant.site.homeTitle && tenant.site.aboutUrl && tenant.site.exploreUrl && enabledSections.length);
  const geographyValid = levelKeys.length > 0 && new Set(levelKeys).size === levelKeys.length
    && tenant.geography.addressFields.every((field) => field === 'address' || levelKeys.includes(field));
  const sectionsValid = tenant.sections.length > 0 && new Set(sectionSlugs).size === sectionSlugs.length && !invalidCreateKinds.length;

  return [
    check('identity', 'Tenant identity', tenant.tenantId && tenant.title && tenant.countryCode.length === 2 ? 'pass' : 'fail',
      'Tenant ID, public title, and ISO alpha-2 country code are required.'),
    check('domains', 'Domain ownership inputs', domainsValid ? 'pass' : 'fail',
      domainsValid ? `${tenant.domains.length} unique hostname${tenant.domains.length === 1 ? '' : 's'} configured.` : 'Configure unique hostnames without protocols, ports, or paths.'),
    check('localization', 'Localization', localesValid && validTimezone(tenant.localization.timezone) && /^[A-Z]{3}$/.test(tenant.localization.currency) ? 'pass' : 'fail',
      'Default locale must be supported; timezone and ISO currency must be valid.'),
    check('navigation', 'Navigation and home', navigationValid && sectionsValid ? 'pass' : 'fail',
      navigationValid && sectionsValid ? `${enabledSections.length} enabled sections form the tenant navigation.` : 'Home copy, safe navigation URLs, unique sections, and valid create kinds are required.'),
    check('policy', 'Moderation policy', tenant.moderationPolicyVersion.trim() ? 'pass' : 'fail',
      tenant.moderationPolicyVersion.trim() ? `Policy version ${tenant.moderationPolicyVersion} is selected.` : 'Select an approved moderation policy version.'),
    check('extensions', 'Extension schemas', tenant.extensionSchemas && typeof tenant.extensionSchemas === 'object' ? 'pass' : 'fail',
      'Country-specific fields are declarative validated schemas.'),
    check('geography', 'Geography contract', geographyValid ? 'pass' : 'fail',
      geographyValid ? `${levelKeys.length} unique jurisdiction levels configured.` : 'Address fields must map to unique configured geography levels.'),
    check('branding', 'Branding', tenant.branding.logoIcon && tenant.branding.favicon ? 'pass' : 'warning',
      tenant.branding.logoIcon && tenant.branding.favicon ? 'Logo and favicon are configured.' : 'A logo and favicon are recommended before public launch.'),
    check('deployment', 'Deployment profile', ['shared', 'dedicated', 'headless'].includes(tenant.deploymentMode) ? 'pass' : 'fail',
      `${tenant.deploymentMode} deployment uses the shared Civic Core contract.`),
  ];
}

function report(tenantId: string, scope: CivicTenantReadinessReport['scope'], checks: CivicTenantReadinessCheck[]): CivicTenantReadinessReport {
  const summary = {
    passed: checks.filter((item) => item.status === 'pass').length,
    warnings: checks.filter((item) => item.status === 'warning').length,
    failed: checks.filter((item) => item.status === 'fail').length,
  };
  return { tenantId, scope, ready: summary.failed === 0, generatedAt: new Date().toISOString(), checks, summary };
}

export function buildTenantConfigurationReadiness(tenant: CivicTenantDefinition): CivicTenantReadinessReport {
  return report(tenant.tenantId, 'configuration', configurationChecks(tenant));
}

export function buildTenantConfigurationPreview(tenant: CivicTenantDefinition) {
  return {
    tenant,
    readiness: buildTenantConfigurationReadiness(tenant),
    presentation: {
      cssVariables: {
        '--civic-primary': tenant.branding.primaryColor,
        '--civic-accent': tenant.branding.accentColor,
        '--civic-surface': tenant.branding.surfaceColor,
        ...(tenant.branding.fontFamily ? { '--civic-font': tenant.branding.fontFamily } : {}),
      },
      navigation: tenant.sections.filter((section) => section.enabled).map((section) => ({
        slug: section.slug, title: section.title, icon: section.icon, href: `/civic?section=${encodeURIComponent(section.slug)}`,
      })),
      home: { title: tenant.site.homeTitle, description: tenant.site.homeDescription, slogan: tenant.slogan },
    },
  };
}

export async function buildTenantLaunchReadiness(tenant: CivicTenantDefinition): Promise<CivicTenantReadinessReport> {
  const membershipModel = db.TenantMembership as CountModel | undefined;
  const jurisdictionModel = db.Jurisdiction as CountModel | undefined;
  const tenantModel = db.CivicTenant as FindModel | undefined;
  const topicModel = db.Topic as FindModel | undefined;
  const [adminCount, jurisdictionCount, domainCollision, knowledgeRoot] = await Promise.all([
    membershipModel?.countDocuments({ tenantId: tenant.tenantId, active: true, roles: 'admin' }) || 0,
    jurisdictionModel?.countDocuments({ tenantId: tenant.tenantId, active: true }) || 0,
    tenantModel?.findOne({ tenantId: { $ne: tenant.tenantId }, domains: { $in: tenant.domains } })
      .select('tenantId domains').lean() || null,
    tenant.site.knowledgeRootTopicId && topicModel
      ? topicModel.findOne({
        _id: tenant.site.knowledgeRootTopicId,
        private: { $ne: true },
        'screening.status': constants.SCREENING_STATUS.status1.code,
      }).select('_id title').lean()
      : null,
  ]);
  const operational = [
    check('domain_uniqueness', 'Cross-tenant domain isolation', domainCollision ? 'fail' : 'pass',
      domainCollision ? 'A configured hostname is assigned to another tenant.' : 'No persisted cross-tenant domain collision was found.'),
    check('tenant_admin', 'Tenant administrator', adminCount > 0 ? 'pass' : 'fail',
      adminCount > 0 ? `${adminCount} active tenant administrator${adminCount === 1 ? '' : 's'} provisioned.` : 'Provision at least one explicit active tenant administrator.'),
    check('jurisdictions', 'Jurisdiction hierarchy', jurisdictionCount > 0 ? 'pass' : 'fail',
      jurisdictionCount > 0 ? `${jurisdictionCount} active jurisdiction record${jurisdictionCount === 1 ? '' : 's'} configured.` : 'Create the tenant jurisdiction hierarchy before launch.'),
    check('knowledge_root', 'Knowledge root', !tenant.site.knowledgeRootTopicId || knowledgeRoot ? (knowledgeRoot ? 'pass' : 'warning') : 'fail',
      tenant.site.knowledgeRootTopicId ? (knowledgeRoot ? 'Configured knowledge root is accepted and public.' : 'Configured knowledge root was not found as an accepted public topic.') : 'A Wikitruth knowledge root is recommended for integrated navigation.'),
  ];
  return report(tenant.tenantId, 'launch', [...configurationChecks(tenant), ...operational]);
}

export function portableTenantConfiguration(tenant: CivicTenantDefinition, readiness: CivicTenantReadinessReport) {
  return {
    format: 'wikitruth.civic-tenant', version: '1.0', exportedAt: new Date().toISOString(),
    tenant, readiness,
  };
}
