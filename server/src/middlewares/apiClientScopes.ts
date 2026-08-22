'use strict';

import type { NextFunction } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import { resolveAgentOperationPolicy } from '../services/agentOperationPolicy';

export function enforceApiClientScope(req: WikitruthRequest, res: WikitruthResponse, next: NextFunction): void {
  if (!req.apiClient) {
    next();
    return;
  }
  const policy = resolveAgentOperationPolicy(req.method, req.path);
  if (!policy) {
    res.status(403).json({
      success: false,
      error: { code: 'AGENT_OPERATION_UNSUPPORTED', message: 'This API operation is not registered for agent credentials.' },
    });
    return;
  }
  if (!policy.agentAllowed) {
    res.status(403).json({
      success: false,
      error: { code: 'HUMAN_AUTHORITY_REQUIRED', message: 'This operation requires an authenticated person and is unavailable to agent credentials.' },
    });
    return;
  }
  if (policy.requiredScope && !req.apiClient.scopes.includes(policy.requiredScope)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AGENT_SCOPE_REQUIRED',
        message: `The agent credential requires the ${policy.requiredScope} scope.`,
        requiredScope: policy.requiredScope,
        operationId: policy.operationId,
      },
    });
    return;
  }
  res.locals.agentOperationPolicy = policy;
  next();
}

export function requiredApiClientScope(method: string, path: string): string | null {
  return resolveAgentOperationPolicy(method, path)?.requiredScope || null;
}
