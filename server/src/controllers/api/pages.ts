'use strict';

import type { Router } from 'express';

import appModForDb from '../../app';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

type PublicPage = {
  _id?: unknown;
  id?: unknown;
  title?: unknown;
  content?: unknown;
  friendlyUrl?: unknown;
  parentId?: unknown;
  editDate?: unknown;
};

type PageQuery = {
  select: (projection: string) => {
    lean: () => Promise<PublicPage | null>;
  };
};

const db = (appModForDb as unknown as {
  db: { models: { Page: { findOne: (query: Record<string, unknown>) => PageQuery } } };
}).db.models;

function publicPageModel(page: PublicPage) {
  return {
    _id: String(page._id || ''),
    id: page.id ? String(page.id) : undefined,
    title: String(page.title || ''),
    content: String(page.content || ''),
    friendlyUrl: String(page.friendlyUrl || ''),
    parentId: page.parentId ? String(page.parentId) : null,
    editDate: page.editDate || null,
  };
}

export = function (router: Router) {
  router.get('/about/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const identifier = decodeURIComponent(String(req.params.id || '')).trim();
    if (!identifier) {
      res.status(400).json({ success: false, message: 'About page identifier is required.' });
      return;
    }

    const projection = '_id id title content friendlyUrl parentId editDate';
    const rootPage = await db.Page.findOne({ friendlyUrl: 'about' }).select(projection).lean();
    if (!rootPage) {
      res.status(404).json({ success: false, message: 'About page hierarchy was not found.' });
      return;
    }

    const identifierQuery: Array<Record<string, unknown>> = [
      { id: identifier },
      { friendlyUrl: identifier },
    ];
    if (/^[a-f0-9]{24}$/i.test(identifier)) {
      identifierQuery.push({ _id: identifier });
    }

    const page = identifier === 'about'
      ? rootPage
      : await db.Page.findOne({ $or: identifierQuery }).select(projection).lean();
    const rootId = String(rootPage._id || '');
    const isInAboutHierarchy = Boolean(
      page && (String(page._id || '') === rootId || String(page.parentId || '') === rootId)
    );

    if (!page || !isInAboutHierarchy) {
      res.status(404).json({ success: false, message: 'About page not found.' });
      return;
    }

    res.json({
      success: true,
      page: publicPageModel(page),
      parent: String(page._id || '') === rootId ? null : publicPageModel(rootPage),
    });
  });
};
