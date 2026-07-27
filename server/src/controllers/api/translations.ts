'use strict';

import type { Router } from 'express';
import appModForDb from '../../app';
import constants from '../../models/constants';
import { ensureCurrentRevision } from '../../services/entryRevisionService';
import { logEntryEvent } from '../../services/entryEventsService';
import { notifySubscribers } from '../../services/notificationsService';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const db = (appModForDb as unknown as { db: { models: Record<string, unknown> } }).db.models as {
  EntryTranslation: {
    find: (query: Record<string, unknown>) => { sort: (sort: Record<string, number>) => { lean: () => Promise<Array<Record<string, unknown>>> } };
    findOne: (query: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    findOneAndUpdate: (query: Record<string, unknown>, update: Record<string, unknown>, options: Record<string, unknown>) => { lean: () => Promise<Record<string, unknown>> };
    findById: (id: string) => Promise<Record<string, unknown> & { save: () => Promise<unknown> } | null>;
  };
};

const TYPE_BY_NAME: Record<string, number> = {
  topic: constants.OBJECT_TYPES.topic, argument: constants.OBJECT_TYPES.argument,
  question: constants.OBJECT_TYPES.question, answer: constants.OBJECT_TYPES.answer,
  artifact: constants.OBJECT_TYPES.artifact, issue: constants.OBJECT_TYPES.issue, opinion: constants.OBJECT_TYPES.opinion,
};

function reviewer(req: WikitruthRequest): boolean {
  return Boolean(req.user?.canPlayRoleOf?.('reviewer') || req.user?.canPlayRoleOf?.('admin'));
}

function actorId(req: WikitruthRequest): string { return String(req.user?._id || req.user?.id || ''); }

function target(req: WikitruthRequest, res: WikitruthResponse): { objectType: number; objectName: string; objectId: string } | null {
  const objectName = String(req.params.objectName || '').trim().toLowerCase();
  const objectId = String(req.params.id || '').trim();
  const objectType = TYPE_BY_NAME[objectName];
  if (!objectType || !objectId) { res.status(400).json({ success: false, message: 'Unsupported translation target' }); return null; }
  return { objectType, objectName, objectId };
}

function locale(value: unknown): string {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalized) ? normalized : '';
}

export = function attachTranslations(router: Router) {
  router.get('/:objectName/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const parsed = target(req, res); if (!parsed) return;
    const query: Record<string, unknown> = { objectType: parsed.objectType, objectId: parsed.objectId };
    if (!reviewer(req)) {
      query.$or = req.user ? [{ status: 'published' }, { createUserId: actorId(req) }] : [{ status: 'published' }];
    }
    const [translations, currentRevision] = await Promise.all([
      db.EntryTranslation.find(query).sort({ locale: 1 }).lean(),
      ensureCurrentRevision({ objectType: parsed.objectType, objectId: parsed.objectId }),
    ]);
    res.json({ success: true, currentRevision: { id: currentRevision._id, number: currentRevision.revisionNumber }, translations: translations.map((item) => ({
      ...item, stale: String(item.sourceRevisionId || '') !== String(currentRevision._id || ''),
    })) });
  });

  router.post('/:objectName/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; }
    const parsed = target(req, res); if (!parsed) return;
    const language = locale(req.body?.locale);
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    if (!language || title.length < 3 || content.length < 10) {
      res.status(400).json({ success: false, message: 'Valid locale, title, and translated content are required' }); return;
    }
    const currentRevision = await ensureCurrentRevision({ objectType: parsed.objectType, objectId: parsed.objectId });
    const existing = await db.EntryTranslation.findOne({ objectType: parsed.objectType, objectId: parsed.objectId, locale: language });
    if (existing && String(existing.createUserId || '') !== actorId(req) && !req.user.canPlayRoleOf?.('admin')) {
      res.status(403).json({ success: false, message: 'Only the translator or an administrator may update this variant' }); return;
    }
    const now = new Date();
    const translation = await db.EntryTranslation.findOneAndUpdate(
      { objectType: parsed.objectType, objectId: parsed.objectId, locale: language },
      {
        $set: {
          ...parsed, locale: language, title, content, contentPreview: content.slice(0, 240),
          sourceRevisionId: currentRevision._id, sourceRevisionNumber: currentRevision.revisionNumber,
          status: 'pending', editUserId: actorId(req), editUsername: req.user.username || '', editDate: now,
          reviewUserId: null, reviewUsername: '', reviewReason: '', reviewDate: null,
        },
        $setOnInsert: { createUserId: actorId(req), createUsername: req.user.username || '', createDate: now },
        $push: { history: { action: existing ? 'updated' : 'submitted', actorUserId: actorId(req), actorUsername: req.user.username || '', date: now } },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    await logEntryEvent({
      eventType: 'translation.submitted', objectType: parsed.objectType, objectName: parsed.objectName, objectId: parsed.objectId,
      actorUserId: actorId(req), actorUsername: String(req.user.username || ''), message: `${language} translation submitted`,
      payload: { translationId: translation._id, locale: language, sourceRevisionId: currentRevision._id },
    });
    res.status(existing ? 200 : 201).json({ success: true, translation });
  });

  router.post('/moderation/review/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!reviewer(req)) { res.status(req.user ? 403 : 401).json({ success: false, message: 'Reviewer access required' }); return; }
    const action = String(req.body?.action || '');
    const reason = String(req.body?.reason || '').trim();
    if (!['publish', 'reject'].includes(action) || reason.length < 5) {
      res.status(400).json({ success: false, message: 'Publish or reject with a review reason of at least 5 characters' }); return;
    }
    const translation = await db.EntryTranslation.findById(String(req.params.id || ''));
    if (!translation) { res.status(404).json({ success: false, message: 'Translation not found' }); return; }
    const currentRevision = await ensureCurrentRevision({ objectType: Number(translation.objectType), objectId: String(translation.objectId) });
    if (action === 'publish' && String(translation.sourceRevisionId || '') !== String(currentRevision._id || '')) {
      res.status(409).json({ success: false, message: 'Translation is stale and must be updated from the current revision' }); return;
    }
    const now = new Date();
    translation.status = action === 'publish' ? 'published' : 'rejected';
    translation.reviewUserId = actorId(req); translation.reviewUsername = req.user?.username || '';
    translation.reviewReason = reason; translation.reviewDate = now; translation.editDate = now;
    (translation.history as Array<Record<string, unknown>>).push({ action: action === 'publish' ? 'published' : 'rejected', reason, actorUserId: actorId(req), actorUsername: req.user?.username || '', date: now });
    await translation.save();
    await logEntryEvent({
      scope: 'privileged', eventType: `translation.${translation.status}`, objectType: Number(translation.objectType),
      objectName: String(translation.objectName), objectId: String(translation.objectId), actorUserId: actorId(req),
      actorUsername: String(req.user?.username || ''), message: reason, payload: { translationId: String(translation._id), locale: translation.locale },
    });
    if (translation.status === 'published') await notifySubscribers({
      target: { objectType: Number(translation.objectType), objectName: String(translation.objectName), objectId: String(translation.objectId) },
      type: 'translation', trigger: 'screening', title: 'Translation published', body: `${translation.locale}: ${translation.title}`,
      excludeUserIds: [actorId(req)], payload: { translationId: String(translation._id), locale: translation.locale },
    });
    res.json({ success: true, translation });
  });
};
