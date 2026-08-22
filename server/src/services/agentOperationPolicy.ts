'use strict';

import operationPolicyData from '../config/agentOperationPolicies.json';
import type { ApiClientScope } from './apiClientService';

export type AgentMutationKind = 'create' | 'propose_edit' | 'graph_create' | 'moderation_advice'
  | 'civic_create' | 'civic_update' | 'civic_link' | 'civic_response' | 'translation' | 'debate_contribution';

export interface AgentOperationPolicy {
  operationId: string;
  method: string;
  pattern: string;
  agentAllowed: boolean;
  requiredScope?: ApiClientScope;
  entryTypeFromPath?: boolean;
  tenantScoped?: boolean;
  mutationKind?: AgentMutationKind;
}

const policies = (operationPolicyData as AgentOperationPolicy[]).map((policy) => ({
  ...policy,
  matcher: new RegExp(policy.pattern, 'i'),
}));

export function resolveAgentOperationPolicy(method: string, path: string): AgentOperationPolicy | null {
  const requestMethod = String(method || '').toUpperCase();
  const normalizedMethod = requestMethod === 'HEAD' ? 'GET' : requestMethod;
  const requestPath = path.startsWith('/') ? path : `/${path}`;
  // Kraken leaves the version segment in req.path for /api/v1 while the
  // compatibility API is already API-relative. Policies use one canonical form.
  const normalizedPath = requestPath
    .replace(/^\/api(?:\/v1)?(?=\/|$)/i, '')
    .replace(/^\/v1(?=\/|$)/i, '') || '/';
  const match = policies.find((policy) => (
    (policy.method === '*' || policy.method === normalizedMethod) && policy.matcher.test(normalizedPath)
  ));
  if (!match) return null;
  const { matcher: _matcher, ...policy } = match;
  return policy;
}

export function listAgentOperationPolicies(): AgentOperationPolicy[] {
  return policies.map(({ matcher: _matcher, ...policy }) => ({ ...policy }));
}

export function entryTypeFromOperationPath(path: string): string | null {
  const match = /^\/(topics|arguments|questions|answers|artifacts|issues|opinions)(?:\/|$)/i.exec(path);
  return match?.[1] ? match[1].replace(/s$/, '') : null;
}
