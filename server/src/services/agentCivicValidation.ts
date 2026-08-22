'use strict';

import { civicRecordInput } from '../controllers/api/civicRecordValidation';
import { validateCivicExtensions } from './civicExtensionService';
import { getCivicTenant } from './civicTenantService';

export type AgentCivicValidationIssue = { field: string; message: string };

export async function validateAgentCivicDraft(
  tenantIdValue: unknown,
  payloadValue: unknown,
  permittedTenantIds: string[],
): Promise<{ errors: AgentCivicValidationIssue[]; warnings: AgentCivicValidationIssue[] }> {
  const errors: AgentCivicValidationIssue[] = [];
  const warnings: AgentCivicValidationIssue[] = [];
  const tenantId = String(tenantIdValue || '').trim().toLowerCase();
  const payload = payloadValue && typeof payloadValue === 'object' && !Array.isArray(payloadValue)
    ? payloadValue as Record<string, unknown> : {};

  if (!tenantId) {
    errors.push({ field: 'tenantId', message: 'tenantId is required for tenant-safe civic validation.' });
    return { errors, warnings };
  }
  if (permittedTenantIds.length && !permittedTenantIds.includes(tenantId)) {
    errors.push({ field: 'tenantId', message: 'This credential is not permitted to contribute to the selected civic tenant.' });
    return { errors, warnings };
  }

  const tenant = await getCivicTenant(tenantId);
  if (!tenant || tenant.status !== 'active') {
    errors.push({ field: 'tenantId', message: 'The selected civic tenant is unavailable.' });
    return { errors, warnings };
  }

  const parsed = civicRecordInput.safeParse(payload);
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => errors.push({
      field: issue.path.length ? `payload.${issue.path.join('.')}` : 'payload',
      message: issue.message,
    }));
    return { errors, warnings };
  }

  const enabledKinds = new Set(tenant.sections
    .filter((section) => section.enabled)
    .flatMap((section) => section.createKinds));
  if (!enabledKinds.has(parsed.data.kind)) {
    errors.push({ field: 'payload.kind', message: 'This civic record kind is not enabled for creation in the selected tenant.' });
  }

  const extensionValidation = validateCivicExtensions(
    tenant.extensionSchemas,
    parsed.data.kind,
    parsed.data.extensions,
  );
  if (!extensionValidation.success) {
    extensionValidation.issues.forEach((issue) => errors.push({ field: issue.path, message: issue.message }));
  }

  warnings.push({
    field: 'operation',
    message: `Mutation will remain pending under tenant policy ${tenant.moderationPolicyVersion}.`,
  });
  return { errors, warnings };
}
