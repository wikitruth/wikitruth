'use strict';

import type { NextFunction } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import type { ApiClientScope } from '../services/apiClientService';

const CONTRIBUTION_PREFIXES = ['/topics', '/arguments', '/questions', '/answers', '/artifacts', '/issues', '/opinions'];
const CONTRIBUTORY_MODERATION_PATHS = ['/moderation/verdict-votes', '/moderation/change-requests', '/moderation/signals', '/moderation/appeals'];

function requiredScope(req: WikitruthRequest): ApiClientScope | null {
  const path = req.path.startsWith('/') ? req.path : `/${req.path}`;
  if (path === '/agent/identity' || path === '/agent/capabilities') return null;
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return 'entries:read';
  if (CONTRIBUTION_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return 'contributions:write';
  if (path === '/outline' || path.startsWith('/outline/')) return 'graph:write';
  if (path === '/civic' || path.startsWith('/civic/') || path.startsWith('/tenants/')) return 'civic:write';
  if (path === '/moderation' || path.startsWith('/moderation/')) return 'moderation:write';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin:write';
  return null;
}

export function enforceApiClientScope(req: WikitruthRequest, res: WikitruthResponse, next: NextFunction): void {
  if (!req.apiClient) {
    next();
    return;
  }
  const scope = requiredScope(req);
  if (!scope) {
    if (req.path.startsWith('/agent/')) {
      next();
      return;
    }
    res.status(403).json({
      success: false,
      error: { code: 'AGENT_OPERATION_UNSUPPORTED', message: 'This API operation is not available to agent credentials.' },
    });
    return;
  }
  if (!req.apiClient.scopes.includes(scope)) {
    res.status(403).json({
      success: false,
      error: { code: 'AGENT_SCOPE_REQUIRED', message: `The agent credential requires the ${scope} scope.`, requiredScope: scope },
    });
    return;
  }
  if (scope === 'moderation:write'
    && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    && !CONTRIBUTORY_MODERATION_PATHS.some((path) => req.path === path || req.path.startsWith(`${path}/`))) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AGENT_MODERATION_CONTRIBUTION_ONLY',
        message: 'Agent credentials may contribute review input but cannot screen content or publish final decisions.',
      },
    });
    return;
  }
  next();
}

export { requiredScope as requiredApiClientScope };
