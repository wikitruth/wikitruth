'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { findCompletedRedirect } from '../../services/entryMergeService';

const API_COLLECTIONS: Record<number, string> = {
  1: 'topics',
  2: 'arguments',
  3: 'questions',
  6: 'artifacts',
  10: 'issues',
  11: 'opinions',
  12: 'answers',
};

export function registerEntryRedirectMiddleware(router: Router, objectType: number): void {
  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse, next) {
    const sourceId = String(req.params.id || '').trim();
    const redirect = sourceId ? await findCompletedRedirect(objectType, sourceId) : null;
    if (!redirect) {
      next();
      return;
    }
    const targetType = Number(redirect.targetObjectType || 0);
    const targetId = String(redirect.targetObjectId || '');
    const collection = API_COLLECTIONS[targetType];
    if (!collection || !targetId) {
      next();
      return;
    }
    res.setHeader('X-Wikitruth-Merged-From', sourceId);
    res.redirect(308, `/api/${collection}/entry/${encodeURIComponent(targetId)}`);
  });
}

