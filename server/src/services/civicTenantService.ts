'use strict';

import appModForDb from '../app';
import {
  builtInCivicTenant,
  builtInCivicTenantForHost,
  BUILT_IN_CIVIC_TENANTS,
} from '../config/civicTenants';
import type { CivicTenantDefinition } from '../types/civicTenancy';
import type { WikitruthRequest } from '../types/http';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

export class CivicTenantResolutionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'CivicTenantResolutionError';
    this.statusCode = statusCode;
  }
}

function normalizeHost(value: unknown): string {
  const firstHost = String(value || '').split(',')[0] || '';
  return firstHost.trim().toLowerCase().split(':')[0] || '';
}

function normalizeTenant(raw: Record<string, any>): CivicTenantDefinition {
  const fallback = builtInCivicTenant(String(raw.tenantId || ''));
  return {
    ...(fallback || {}),
    ...raw,
    tenantId: String(raw.tenantId || fallback?.tenantId || '').trim().toLowerCase(),
    status: raw.status || fallback?.status || 'active',
    countryCode: String(raw.countryCode || fallback?.countryCode || '').trim().toUpperCase(),
    domains: Array.isArray(raw.domains) ? raw.domains.map(normalizeHost).filter(Boolean) : (fallback?.domains || []),
    branding: { ...(fallback?.branding || {}), ...(raw.branding || {}) },
    localization: { ...(fallback?.localization || {}), ...(raw.localization || {}) },
    geography: { ...(fallback?.geography || {}), ...(raw.geography || {}) },
    sections: Array.isArray(raw.sections) && raw.sections.length ? raw.sections : (fallback?.sections || []),
    featureFlags: { ...(fallback?.featureFlags || {}), ...(raw.featureFlags || {}) },
  } as CivicTenantDefinition;
}

async function persistedTenant(query: Record<string, unknown>): Promise<CivicTenantDefinition | null> {
  if (!db.CivicTenant?.findOne) return null;
  const result = await db.CivicTenant.findOne({ status: 'active', ...query }).lean();
  return result ? normalizeTenant(result) : null;
}

export async function getCivicTenant(tenantId: string): Promise<CivicTenantDefinition | null> {
  const normalized = String(tenantId || '').trim().toLowerCase();
  if (!normalized) return null;
  return await persistedTenant({ tenantId: normalized }) || builtInCivicTenant(normalized);
}

export async function getCivicTenantForHost(hostname: string): Promise<CivicTenantDefinition | null> {
  const host = normalizeHost(hostname);
  if (!host) return null;
  return await persistedTenant({ domains: host }) || builtInCivicTenantForHost(host);
}

export function requestHostname(req: WikitruthRequest): string {
  return normalizeHost(req.get('x-forwarded-host') || req.get('host') || req.hostname);
}

export async function resolveCivicTenant(req: WikitruthRequest): Promise<CivicTenantDefinition> {
  const explicitTenantId = String(req.params?.tenantId || '').trim().toLowerCase();
  const fixedTenantId = String(process.env.CIVIC_FIXED_TENANT_ID || '').trim().toLowerCase();
  const defaultTenantId = String(process.env.CIVIC_DEFAULT_TENANT_ID || 'fixtheph').trim().toLowerCase();
  const hostTenant = await getCivicTenantForHost(requestHostname(req));

  if (fixedTenantId && explicitTenantId && fixedTenantId !== explicitTenantId) {
    throw new CivicTenantResolutionError('Requested tenant does not match this dedicated deployment', 409);
  }
  if (hostTenant && explicitTenantId && hostTenant.tenantId !== explicitTenantId) {
    throw new CivicTenantResolutionError('Requested tenant does not match the current host', 409);
  }

  const tenantId = fixedTenantId || explicitTenantId || hostTenant?.tenantId || defaultTenantId;
  const tenant = await getCivicTenant(tenantId);
  if (!tenant || tenant.status !== 'active') {
    throw new CivicTenantResolutionError('Civic tenant not found', 404);
  }
  return tenant;
}

export async function bootstrapBuiltInCivicTenants(userId?: string): Promise<number> {
  if (!db.CivicTenant?.updateOne) return 0;
  await Promise.all(BUILT_IN_CIVIC_TENANTS.map((tenant) => db.CivicTenant.updateOne(
    { tenantId: tenant.tenantId },
    {
      $setOnInsert: {
        ...tenant,
        createUserId: userId || null,
        editUserId: userId || null,
        createDate: new Date(),
        editDate: new Date(),
      },
    },
    { upsert: true },
  )));
  return BUILT_IN_CIVIC_TENANTS.length;
}

export function publicCivicTenant(tenant: CivicTenantDefinition): CivicTenantDefinition {
  return JSON.parse(JSON.stringify(tenant)) as CivicTenantDefinition;
}
