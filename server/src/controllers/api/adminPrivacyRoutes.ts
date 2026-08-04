import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  executePrivacyRequest,
  listPrivacyRequests,
  previewAnonymization,
  reviewPrivacyRequest,
  setPrivacyLegalHold,
} from '../../services/privacyRequestService';

function actor(req: WikitruthRequest) {
  return { actorUserId: String(req.user?._id || req.user?.id || ''), actorUsername: String(req.user?.username || '') };
}

export function registerAdminPrivacyRoutes(
  router: Router,
  ensureAdmin: (req: WikitruthRequest, res: WikitruthResponse) => boolean,
) {
  router.get('/privacy-requests', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, requests: await listPrivacyRequests({ limit: Number(req.query.limit || 100) }) });
  });

  router.post('/privacy-requests/:id/preview', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const preview = await previewAnonymization(String(req.params.id || ''), actor(req));
      if (!preview) { res.status(404).json({ success: false, message: 'Privacy request not found' }); return; }
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, preview });
    } catch (error) {
      res.status(409).json({ success: false, message: error instanceof Error ? error.message : 'Unable to preview anonymization' });
    }
  });

  router.post('/privacy-requests/:id/actions', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const action = String(req.body?.action || '');
    const note = String(req.body?.note || '').trim();
    try {
      let privacyRequest;
      if (['review', 'approve', 'reject'].includes(action)) {
        if ((action === 'reject' || action === 'review') && note.length < 3) throw new Error('A review note of at least 3 characters is required');
        privacyRequest = await reviewPrivacyRequest(String(req.params.id || ''), {
          action: action as 'review' | 'approve' | 'reject', note, ...actor(req),
        });
      } else if (action === 'hold' || action === 'clear_hold') {
        privacyRequest = await setPrivacyLegalHold(String(req.params.id || ''), {
          active: action === 'hold', reason: note, ...actor(req),
        });
      } else if (action === 'execute') {
        privacyRequest = await executePrivacyRequest(String(req.params.id || ''), {
          ...actor(req), previewToken: String(req.body?.previewToken || ''), confirmation: String(req.body?.confirmation || ''),
        });
      } else {
        res.status(400).json({ success: false, message: 'Unsupported privacy request action' }); return;
      }
      if (!privacyRequest) { res.status(404).json({ success: false, message: 'Privacy request not found' }); return; }
      res.json({ success: true, request: privacyRequest });
    } catch (error) {
      res.status(409).json({ success: false, message: error instanceof Error ? error.message : 'Privacy request action failed' });
    }
  });
}
