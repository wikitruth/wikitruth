'use strict';
import type { FlowUtilsModule, ConstantsModule, UtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';
import { errorMessage } from '../../types/errors';
import * as flowUtilsNs from '../../utils/flowUtils';
import appModForDb from '../../app';
import constantsMod from '../../models/constants';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = constantsMod as unknown as ConstantsModule;
import * as utils from '../../utils/utils';
import * as answersService from '../../services/answersService';
import { applyViewModeFilter } from './viewFilter';
import { applyLegacyEntryContext, resolveLegacyEntryContext } from './entryContext';
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
export = function (router: Router) {
  // GET /api/answers - List answers
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const model: Record<string, unknown> = {};
      flowUtils.setScreeningModel(req, model);
      
      const query: Record<string, unknown> = {
        ownerType: constants.OBJECT_TYPES.question,
        private: false,
      };
      applyViewModeFilter(req, query, (model.screening as { status?: unknown } | undefined)?.status);
      
      if (req.query.question) {
        query.ownerId = req.query.question;
      }
      
      const results = await answersService.getAnswersList(query, { limit: 50 });
      model.answers = results;
      
      delete model.screening;
      res.json(model);
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });

  // GET /api/answers/entry/:id - Get single answer
  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const answerId = String(req.params.id || '').trim();
      if (!answerId) {
        return res.status(400).json({ error: 'Answer id is required' });
      }

      const answer = await answersService.getAnswerEntry(answerId, req);
      
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }

      const context = await resolveLegacyEntryContext(req, constants.OBJECT_TYPES.answer, answerId);
      applyLegacyEntryContext(answer, context);

      const [issues, opinions] = await Promise.all([
        db.Issue.find({
          ownerType: constants.OBJECT_TYPES.answer,
          ownerId: answerId,
          private: false,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }).sort({ editDate: -1 }).limit(5).lean(),
        db.Opinion.find({
          parentId: null,
          ownerType: constants.OBJECT_TYPES.answer,
          ownerId: answerId,
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

      const topicLinks = context.topicLink?.topic ? [context.topicLink.topic] : [];

      res.json({
        topic: context.topic || answer.parentTopic || null,
        parentTopic: context.parentTopic || null,
        grandParentTopic: context.grandParentTopic || null,
        topicLinks: topicLinks,
        answer: answer,
        issues: issues,
        opinions: opinions,
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });

  // POST /api/answers - Create answer
  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await POST_answer_create(req, res);
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });

  // PUT /api/answers/entry/:id - Update answer
  router.put('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_answer_update(req, res);
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });
};

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

async function POST_answer_create(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const references = String(req.body?.references || req.body?.sources || '').trim();
  const questionId = req.body?.questionId || req.query?.question || null;
  const isPrivate = Boolean(req.body?.private);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  if (!questionId) {
    return res.status(400).json({ error: 'Question ID is required' });
  }

  const now = new Date();
  const answer = await db.Answer.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    references: references,
    friendlyUrl: utils.urlify(title),
    questionId: questionId,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    verdict: {
      status: constants.VERDICT_STATUS.pending,
      editDate: now,
      editUserId: req.user._id,
    },
    private: isPrivate,
  });

  res.status(201).json({
    success: true,
    answer: {
      _id: answer._id,
      title: answer.title,
      friendlyUrl: answer.friendlyUrl || utils.urlify(answer.title),
      content: answer.content,
      references: answer.references,
      questionId: answer.questionId,
      private: answer.private,
      createDate: answer.createDate,
      editDate: answer.editDate,
    },
  });
}

async function PUT_answer_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const answer = await db.Answer.findById(req.params.id);
  if (!answer) {
    return res.status(404).json({ error: 'Answer not found' });
  }
  if (!canEditEntry(answer, req.user as unknown as Record<string, unknown> | undefined)) {
    return res.status(403).json({ error: 'Not allowed to edit this answer' });
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = String(req.body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    answer.title = title;
    answer.friendlyUrl = utils.urlify(title);
  }

  if (typeof req.body?.description !== 'undefined' || typeof req.body?.content !== 'undefined') {
    const content = String(req.body?.description || req.body?.content || '').trim();
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    answer.content = content;
    answer.contentPreview = content.slice(0, 240);
  }

  if (typeof req.body?.references !== 'undefined' || typeof req.body?.sources !== 'undefined') {
    answer.references = String(req.body?.references || req.body?.sources || '').trim();
  }

  if (typeof req.body?.private !== 'undefined') {
    answer.private = Boolean(req.body.private);
  }

  if (typeof req.body?.questionId !== 'undefined') {
    answer.questionId = req.body.questionId || null;
  }

  answer.editDate = new Date();
  answer.editUserId = req.user._id;
  await answer.save();

  res.json({
    success: true,
    answer: {
      _id: answer._id,
      title: answer.title,
      friendlyUrl: answer.friendlyUrl || utils.urlify(answer.title),
      content: answer.content,
      references: answer.references,
      questionId: answer.questionId,
      private: answer.private,
      createDate: answer.createDate,
      editDate: answer.editDate,
    },
  });
}
