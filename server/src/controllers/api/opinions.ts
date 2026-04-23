'use strict';
import type { FlowUtilsModule, ConstantsModule, UtilsModule } from '../../types/legacyModules';
import type { OpinionsServiceContract } from '../../services/serviceTypes';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';
const flowUtils = require('../../utils/flowUtils') as FlowUtilsModule;
const constants = require('../../models/constants') as ConstantsModule;
const utils = require('../../utils/utils') as UtilsModule;
const opinionsService = require('../../services/opinionsService') as OpinionsServiceContract;
const { applyViewModeFilter } = require('./viewFilter');
const db = require('../../app').db.models;
const { logEntryEvent } = require('../../services/entryEventsService');
const { notifySubscribers } = require('../../services/notificationsService');

module.exports = function (router: Router) {
  // Get opinions list
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_opinions(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get opinion entry
  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_opinion_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create opinion entry
  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await POST_opinion_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/opinions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update opinion entry
  router.put('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_opinion_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/opinions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_opinions(req: WikitruthRequest, res: WikitruthResponse) {
  let model: Record<string, unknown> = {};
  flowUtils.setScreeningModel(req, model);
  
  const query: Record<string, unknown> = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
  };
  applyViewModeFilter(req, query, (model.screening as { status?: unknown } | undefined)?.status);
  
  if (req.query.topic) {
    query.ownerId = req.query.topic;
  }
  
  const results = await opinionsService.getOpinionsList(query, { limit: 50 });
  
  model.opinions = results;
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}

async function GET_opinion_entry(req: WikitruthRequest, res: WikitruthResponse) {
  const opinionId = String(req.params.id || '').trim();
  if (!opinionId) {
    return res.status(400).json({ error: 'Opinion id is required' });
  }

  const opinion = await opinionsService.getOpinionEntry(opinionId, req);
  
  if (!opinion) {
    return res.status(404).json({ error: 'Opinion not found' });
  }

  const [issues, opinions] = await Promise.all([
    db.Issue.find({
      ownerType: opinion.ownerType,
      ownerId: opinion.ownerId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Opinion.find({
      parentId: opinionId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
  ]);

  await flowUtils.setEditorsUsername(issues);
  issues.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });

  await flowUtils.setEditorsUsername(opinions);
  opinions.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });

  res.json({
    opinion: opinion,
    issues: issues,
    opinions: opinions,
  });
}

function canEditEntry(entry: Record<string, unknown> | null | undefined, user: Record<string, unknown> | null | undefined): boolean {
  if (!entry || !user) {
    return false;
  }
  const canPlayRoleOf = user.canPlayRoleOf as ((role: string) => boolean) | undefined;
  if (typeof canPlayRoleOf === 'function' && canPlayRoleOf('admin')) {
    return true;
  }
  return String(entry.createUserId || '') === String(user._id || user.id || '');
}

function normalizeOpinionClassification(value: unknown): 'supplement' | 'objection' | 'question' | 'general' {
  const normalized = String(value || '').trim().toLowerCase();
  switch (normalized) {
    case 'supplement':
    case 'objection':
    case 'question':
      return normalized;
    default:
      return 'general';
  }
}

function normalizeTextForSimilarity(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\s\W_]+/g, ' ')
    .trim();
}

async function POST_opinion_create(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const ownerId = req.body?.topicId || req.body?.ownerId || req.query?.topic || null;
  const parentId = req.body?.parentId || null;
  const isPrivate = Boolean(req.body?.private);
  const classification = normalizeOpinionClassification(req.body?.classification);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  if (description.length > 5000) {
    return res.status(400).json({ error: 'Description is too long. Limit is 5000 characters.' });
  }

  // Thread quality guardrails: prevent repetitive duplicate posts and posting spikes in the same thread.
  const recentWindowStart = new Date(Date.now() - 10 * 60 * 1000);
  const lastDayWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recentCount, recentEntries] = await Promise.all([
    db.Opinion.countDocuments({
      createUserId: req.user._id,
      ownerId: ownerId,
      parentId: parentId,
      createDate: { $gte: recentWindowStart },
    }),
    db.Opinion.find({
      createUserId: req.user._id,
      ownerId: ownerId,
      parentId: parentId,
      createDate: { $gte: lastDayWindowStart },
    })
      .sort({ createDate: -1 })
      .limit(50)
      .select('title content')
      .lean(),
  ]);

  if (recentCount >= 8) {
    return res.status(429).json({
      error: 'Too many comments in this thread. Please wait a few minutes before posting again.',
    });
  }

  const incomingNormalized = normalizeTextForSimilarity(`${title} ${description}`);
  const duplicateFound = recentEntries.some((entry: Record<string, unknown>) => {
    const existingNormalized = normalizeTextForSimilarity(`${entry?.title || ''} ${entry?.content || ''}`);
    return existingNormalized && existingNormalized === incomingNormalized;
  });

  if (duplicateFound) {
    return res.status(409).json({
      error: 'Duplicate comment detected in this thread. Please edit your existing comment instead.',
    });
  }

  const now = new Date();
  const opinion = await db.Opinion.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    friendlyUrl: utils.urlify(title),
    ownerType: constants.OBJECT_TYPES.topic,
    ownerId: ownerId,
    parentId: parentId,
    categoryId: ownerId,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    private: isPrivate,
    extras: {
      classification,
    },
  });

  const timelineObjectType = ownerId ? constants.OBJECT_TYPES.topic : constants.OBJECT_TYPES.opinion;
  const timelineObjectName = ownerId ? 'topic' : 'opinion';
  const timelineObjectId = String(ownerId || opinion._id);

  await logEntryEvent({
    eventType: 'discussion.reply.created',
    objectType: timelineObjectType,
    objectName: timelineObjectName,
    objectId: timelineObjectId,
    actorUserId: String(req.user._id),
    actorUsername: String(req.user.username || ''),
    message: `Comment created (${classification})`,
    payload: {
      opinionId: String(opinion._id),
      ownerId: String(ownerId || ''),
      parentId: String(parentId || ''),
      classification,
    },
  });

  if (ownerId) {
    await notifySubscribers({
      target: {
        objectType: constants.OBJECT_TYPES.topic,
        objectName: 'topic',
        objectId: String(ownerId),
      },
      type: 'reply',
      trigger: 'reply',
      title: 'New discussion comment',
      body: title,
      link: `/opinions/entry/${encodeURIComponent(String(opinion.friendlyUrl || opinion._id))}/${encodeURIComponent(String(opinion._id))}`,
      excludeUserIds: [String(req.user._id)],
      payload: {
        classification,
        ownerId: String(ownerId),
      },
    });
  }

  res.status(201).json({
    success: true,
    opinion: {
      _id: opinion._id,
      title: opinion.title,
      friendlyUrl: opinion.friendlyUrl || utils.urlify(opinion.title),
      content: opinion.content,
      ownerId: opinion.ownerId,
      private: opinion.private,
      classification,
      createDate: opinion.createDate,
      editDate: opinion.editDate,
    },
  });
}

async function PUT_opinion_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const opinion = await db.Opinion.findById(req.params.id);
  if (!opinion) {
    return res.status(404).json({ error: 'Opinion not found' });
  }
  if (!canEditEntry(opinion, req.user as unknown as Record<string, unknown> | undefined)) {
    return res.status(403).json({ error: 'Not allowed to edit this opinion' });
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = String(req.body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    opinion.title = title;
    opinion.friendlyUrl = utils.urlify(title);
  }

  if (typeof req.body?.description !== 'undefined' || typeof req.body?.content !== 'undefined') {
    const content = String(req.body?.description || req.body?.content || '').trim();
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    opinion.content = content;
    opinion.contentPreview = content.slice(0, 240);
  }

  if (typeof req.body?.classification !== 'undefined') {
    const classification = normalizeOpinionClassification(req.body?.classification);
    opinion.extras = opinion.extras || {};
    opinion.extras.classification = classification;
  }

  if (typeof req.body?.private !== 'undefined') {
    opinion.private = Boolean(req.body.private);
  }

  if (typeof req.body?.topicId !== 'undefined' || typeof req.body?.ownerId !== 'undefined') {
    opinion.ownerId = req.body.topicId || req.body.ownerId || null;
    opinion.categoryId = opinion.ownerId;
  }

  opinion.editDate = new Date();
  opinion.editUserId = req.user._id;
  await opinion.save();

  res.json({
    success: true,
    opinion: {
      _id: opinion._id,
      title: opinion.title,
      friendlyUrl: opinion.friendlyUrl || utils.urlify(opinion.title),
      content: opinion.content,
      ownerId: opinion.ownerId,
      private: opinion.private,
      classification: normalizeOpinionClassification(opinion?.extras?.classification),
      createDate: opinion.createDate,
      editDate: opinion.editDate,
    },
  });
}
