'use strict';

import type { ApplicationDefinition } from '../types/domain';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import applicationsMod from '../models/applications';
import { resolveCivicTenant } from './civicTenantService';

const applications = applicationsMod as unknown as {
  getApplications: () => ApplicationDefinition[];
  applicationFromCivicTenant: (tenant: Record<string, unknown>) => ApplicationDefinition;
};

function requestsLocalCivicApplication(req: WikitruthRequest): boolean {
  const value = String(req.query?.civic || '').trim().toLowerCase();
  const path = String(req.path || '');
  return value === '1' || value === 'true' || path === '/civic' || path.startsWith('/civic/');
}

export async function resolveActiveApplication(
  req: WikitruthRequest,
  res: WikitruthResponse,
): Promise<ApplicationDefinition | null> {
  const hostApplication = (res.locals.application || null) as ApplicationDefinition | null;
  if (!requestsLocalCivicApplication(req)) return hostApplication;

  const tenant = await resolveCivicTenant(req);
  const civicApplication = applications.applicationFromCivicTenant(tenant as unknown as Record<string, unknown>);
  if (hostApplication && hostApplication.id !== civicApplication.id) {
    const error = new Error('Requested civic application does not match the current host') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }
  return hostApplication || civicApplication;
}

export function visibleApplications(activeApplication: ApplicationDefinition | null): ApplicationDefinition[] {
  return activeApplication ? [activeApplication] : applications.getApplications();
}
