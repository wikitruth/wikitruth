'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

function requireAgent(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (!req.apiClient || !req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'AGENT_AUTHENTICATION_REQUIRED', message: 'A valid agent credential is required.' },
    });
    return false;
  }
  return true;
}

export = function (router: Router) {
  router.get('/identity', function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    res.json({
      success: true,
      client: req.apiClient,
      accountableUser: { id: String(req.user?._id || req.user?.id || ''), username: String(req.user?.username || '') },
    });
  });

  router.get('/capabilities', function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireAgent(req, res)) return;
    const scopes = new Set(req.apiClient?.scopes || []);
    res.json({
      success: true,
      apiVersion: 'v1',
      authentication: 'Bearer wt_agent_<clientId>.<secret>',
      scopes: Array.from(scopes),
      contributionContract: {
        screening: 'pending',
        duplicateChecks: true,
        contributorOnboarding: true,
        automaticVerdict: false,
        attribution: 'api_client_and_accountable_user',
      },
      endpoints: {
        read: scopes.has('entries:read') ? ['/api/v1/topics', '/api/v1/arguments', '/api/v1/questions', '/api/v1/answers', '/api/v1/artifacts', '/api/v1/issues', '/api/v1/opinions'] : [],
        contribute: scopes.has('contributions:write') ? ['/api/v1/topics', '/api/v1/arguments', '/api/v1/questions', '/api/v1/answers', '/api/v1/artifacts', '/api/v1/issues', '/api/v1/opinions'] : [],
        graph: scopes.has('graph:write') ? ['/api/v1/outline/link'] : [],
        civic: scopes.has('civic:write') ? ['/api/v1/civic/records', '/api/v1/tenants/{tenantId}/civic/records'] : [],
        moderation: scopes.has('moderation:write') ? ['/api/v1/moderation/verdict-votes', '/api/v1/moderation/change-requests'] : [],
      },
    });
  });
};
