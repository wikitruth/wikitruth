'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  listWebSessions,
  revokeOtherWebSessions,
  revokeWebSessionById,
} from '../../services/webSessionService';

function requireUser(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (req.user) return true;
  res.status(401).json({ success: false, message: 'Authentication required' });
  return false;
}

export function registerAuthSessionRoutes(router: Router): void {
  router.get('/sessions', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!requireUser(req, res)) return;
    res.json({ success: true, sessions: await listWebSessions(req) });
  });

  router.delete('/sessions/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!requireUser(req, res)) return;
    if (req.params.id === req.session.webSession?.registryId) {
      res.status(409).json({ success: false, message: 'Use sign out to end the current session' });
      return;
    }
    const revoked = await revokeWebSessionById(req, String(req.params.id || ''));
    if (!revoked) {
      res.status(404).json({ success: false, message: 'Active session not found' });
      return;
    }
    res.json({ success: true, message: 'Session revoked' });
  });

  router.post('/sessions/revoke-others', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!requireUser(req, res)) return;
    const userId = String(req.user?._id || req.user?.id || '');
    const revoked = await revokeOtherWebSessions(req, userId, 'revoked_all_others');
    res.json({ success: true, revoked });
  });
}
