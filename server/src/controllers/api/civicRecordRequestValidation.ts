'use strict';

import type { ZodError } from 'zod';

import type { CivicTenantDefinition } from '../../types/civicTenancy';
import type { WikitruthResponse } from '../../types/http';

export function sendCivicValidationError(res: WikitruthResponse, error: ZodError): void {
  res.status(400).json({
    message: 'Invalid civic record data',
    details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

export function sendExtensionValidationError(
  res: WikitruthResponse,
  issues: Array<{ path: string; message: string }>,
): void {
  res.status(400).json({ message: 'Invalid tenant-specific civic data', details: issues });
}

export function normalizeCivicLocation(
  tenant: CivicTenantDefinition,
  rawLocation: Record<string, unknown> | undefined,
  currentLocation: Record<string, unknown> = {},
): { ok: true; location: Record<string, unknown> } | { ok: false; message: string } {
  const allowed = new Set(['countryCode', 'coordinates', ...tenant.geography.addressFields]);
  const invalid = Object.keys(rawLocation || {}).find((key) => !allowed.has(key));
  if (invalid) return { ok: false, message: `Location field ${invalid} is not configured for this tenant` };
  return {
    ok: true,
    location: { ...currentLocation, ...(rawLocation || {}), countryCode: tenant.countryCode },
  };
}
