'use strict';

import type { ApplicationDefinition } from '../types/domain';
import {
  FIXPH_TENANT,
  builtInCivicTenantForHost,
  normalizeCivicTenant,
  publicCivicTenantDefinition,
} from '../config/civicTenants';
import type { CivicTenantDefinition } from '../types/civicTenancy';

/*var wikitruthDomains = [
    'wikitruth.co',
    'wikitruth.me',
    'wikitruthproject.org',

    'www.wikitruth.co',
    'www.wikitruth.me',
    'www.wikitruthproject.org'
];*/

function configuredTenantHomeUrl(tenant: CivicTenantDefinition): string {
  const configured = String(process.env.CIVIC_TENANT_HOME_URL_OVERRIDES || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf('=');
      return separator > 0
        ? [entry.slice(0, separator).trim().toLowerCase(), entry.slice(separator + 1).trim()]
        : ['', ''];
    })
    .find(([tenantId]) => tenantId === tenant.tenantId.toLowerCase())?.[1];

  // Allow same-origin paths or explicit web URLs, but never protocol-relative or script URLs.
  if (configured && (/^\/(?!\/)/.test(configured) || /^https?:\/\//i.test(configured))) {
    return configured;
  }
  return tenant.domains[0] ? `https://${tenant.domains[0]}` : '/civic';
}

function applicationFromCivicTenant(tenant: CivicTenantDefinition): ApplicationDefinition {
  const normalized = normalizeCivicTenant(tenant as unknown as Record<string, any>);
  const publicTenant = publicCivicTenantDefinition(normalized as unknown as Record<string, any>);
  const homeUrl = configuredTenantHomeUrl(normalized);
  const isSameOriginMount = homeUrl.startsWith('/');
  return {
    id: normalized.tenantId,
    title: normalized.title,
    name: normalized.title,
    navTitle: normalized.navTitle,
    slogan: normalized.slogan,
    logoIcon: normalized.branding.logoIcon,
    homeUrl,
    aboutUrl: isSameOriginMount ? homeUrl : normalized.site.aboutUrl || '/civic',
    exploreUrl: isSameOriginMount ? homeUrl : normalized.site.exploreUrl || '/explore',
    exploreTopicId: normalized.site.knowledgeRootTopicId || undefined,
    domains: normalized.domains,
    civicTenant: publicTenant,
    jumbotron: {
      title: normalized.site.homeTitle || normalized.title,
      description: normalized.site.homeDescription || normalized.slogan,
    },
    sections: normalized.sections.filter((section) => section.enabled).map((section) => ({
      title: section.title,
      iconClass: `fa fa-${section.icon}`,
      url: `/civic/${section.slug}`,
      description: section.description,
    })),
  };
}

const APPLICATIONS: ApplicationDefinition[] = [applicationFromCivicTenant(FIXPH_TENANT)];

function getApplications() {
  return APPLICATIONS;
}

function getApplication(req: { hostname?: string }): ApplicationDefinition | null {
  const domainName = req.hostname || '';
  let application: ApplicationDefinition | null = null;
  APPLICATIONS.some(function (app) {
    if ((app.domains || []).indexOf(domainName) > -1) {
      application = app;
      return true;
    }
  });
  /* TODO: put this code back when
  if(wikitruthDomains.indexOf(domainName) === -1) {}*/
  return application;
}

async function getApplicationAsync(req: {
  hostname?: string;
  get?: (name: string) => string | undefined;
  app?: { db?: { models?: Record<string, unknown> } };
}): Promise<ApplicationDefinition | null> {
  const hostname = (String(req.get?.('x-forwarded-host') || req.hostname || '').split(':')[0] || '').toLowerCase();
  const CivicTenant = req.app?.db?.models?.CivicTenant as {
    findOne?: (query: Record<string, unknown>) => { lean: () => Promise<unknown> };
  } | undefined;
  const tenant = CivicTenant?.findOne
    ? await CivicTenant.findOne({ status: 'active', domains: hostname }).lean()
    : null;
  if (tenant) return applicationFromCivicTenant(tenant as CivicTenantDefinition);
  const builtIn = builtInCivicTenantForHost(hostname);
  return builtIn ? applicationFromCivicTenant(builtIn) : null;
}

export = {
  getApplications,
  getApplication,
  getApplicationAsync,
  applicationFromCivicTenant,
};
