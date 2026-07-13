'use strict';

import appModForDb from '../app';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import type { CivicTenantRole } from '../types/civicTenancy';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

function hasGlobalRole(req: WikitruthRequest, role: CivicTenantRole): boolean {
  return Boolean(req.user?.canPlayRoleOf?.(role));
}

export async function civicTenantRoles(req: WikitruthRequest, tenantId: string): Promise<Set<CivicTenantRole>> {
  const roles = new Set<CivicTenantRole>();
  if (!req.user) return roles;

  if (hasGlobalRole(req, 'admin')) {
    return new Set<CivicTenantRole>(['reader', 'contributor', 'screener', 'reviewer', 'admin']);
  }

  const userId = String(req.user._id || req.user.id || '');
  const membership = userId && db.TenantMembership?.findOne
    ? await db.TenantMembership.findOne({ tenantId, userId, active: true }).lean()
    : null;
  if (Array.isArray(membership?.roles)) {
    membership.roles.forEach((role: CivicTenantRole) => roles.add(role));
  }

  // Existing FixPH users retain their current capabilities until memberships are backfilled.
  if (!membership && tenantId === 'fixtheph') {
    (['reader', 'contributor', 'screener', 'reviewer'] as CivicTenantRole[]).forEach((role) => {
      if (hasGlobalRole(req, role)) roles.add(role);
    });
  }
  return roles;
}

export async function ensureCivicTenantRole(
  req: WikitruthRequest,
  res: WikitruthResponse,
  acceptedRoles: CivicTenantRole[],
): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return false;
  }
  const tenantId = req.civicTenant?.tenantId || '';
  const roles = await civicTenantRoles(req, tenantId);
  if (acceptedRoles.some((role) => roles.has(role))) return true;
  res.status(403).json({
    success: false,
    message: `${acceptedRoles.join(' or ')} tenant privileges required`,
  });
  return false;
}
