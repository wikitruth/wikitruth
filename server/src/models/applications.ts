'use strict';

import type { ApplicationDefinition } from '../types/domain';
import { FIXPH_TENANT, builtInCivicTenantForHost } from '../config/civicTenants';
import type { CivicTenantDefinition } from '../types/civicTenancy';

/*var wikitruthDomains = [
    'wikitruth.co',
    'wikitruth.me',
    'wikitruthproject.org',

    'www.wikitruth.co',
    'www.wikitruth.me',
    'www.wikitruthproject.org'
];*/

function applicationFromCivicTenant(tenant: CivicTenantDefinition): ApplicationDefinition {
  return {
    id: tenant.tenantId,
    title: tenant.title,
    name: tenant.title,
    navTitle: tenant.navTitle,
    slogan: tenant.slogan,
    logoIcon: tenant.branding.logoIcon,
    homeUrl: tenant.domains[0] ? `https://${tenant.domains[0]}` : '/civic',
    aboutUrl: '/civic',
    exploreUrl: '/civic',
    domains: tenant.domains,
    civicTenant: tenant,
    jumbotron: { title: tenant.title, description: tenant.slogan },
    sections: tenant.sections.filter((section) => section.enabled).map((section) => ({
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
  let domainName = req.hostname || '',
    application: ApplicationDefinition | null = null;
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
  app?: { db?: { models?: Record<string, any> } };
}): Promise<ApplicationDefinition | null> {
  const hostname = (String(req.get?.('x-forwarded-host') || req.hostname || '').split(':')[0] || '').toLowerCase();
  const CivicTenant = req.app?.db?.models?.CivicTenant;
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
