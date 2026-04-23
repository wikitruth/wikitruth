'use strict';
import type { FlowUtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import type { AuthUser } from '../../types/auth';
import type { ServiceEntry, ServiceQuery } from '../../services/serviceTypes';
import type { WikitruthConstants } from '../../types/constants';
import { applyViewModeFilter } from './viewFilter';

const flowUtils = require('../../utils/flowUtils') as FlowUtilsModule;
const constants = require('../../models/constants') as WikitruthConstants;
const utils = require('../../utils/utils') as {
  urlify: (value: string) => string;
};
const questionsService = require('../../services/questionsService') as {
  getQuestionsList: (
    query: ServiceQuery,
    options: {
      limit?: number;
      req?: WikitruthRequest;
    }
  ) => Promise<ServiceEntry[]>;
  getQuestionEntry: (questionId: string, req: WikitruthRequest) => Promise<ServiceEntry | null>;
};

type QuestionDocument = {
  _id: unknown;
  title?: string;
  friendlyUrl?: string;
  content?: string;
  contentPreview?: string;
  references?: string;
  ownerId?: unknown;
  categoryId?: unknown;
  private?: boolean;
  createDate?: Date;
  editDate?: Date;
  editUserId?: unknown;
  createUserId?: unknown;
  save: () => Promise<QuestionDocument>;
};

const db = require('../../app').db.models as any;

type QuestionListResponse = {
  screening?: {
    status?: number;
  };
  questions?: ServiceEntry[];
};

type QuestionWriteBody = {
  title?: unknown;
  description?: unknown;
  content?: unknown;
  references?: unknown;
  topicId?: unknown;
  ownerId?: unknown;
  groupId?: unknown;
  private?: unknown;
};

module.exports = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_questions(req, res);
    } catch (error) {
      console.error('Error in GET /api/questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_question_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/questions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await POST_question_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_question_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/questions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_questions(req: WikitruthRequest, res: WikitruthResponse) {
  const model: QuestionListResponse = {};
  flowUtils.setScreeningModel(req, model);

  const query: ServiceQuery = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
  };

  applyViewModeFilter(req, query as Record<string, unknown>, model.screening?.status);

  if (req.query.topic) {
    query.ownerId = req.query.topic;
  }

  const questions = await questionsService.getQuestionsList(query, {
    limit: 50,
    req: req,
  });

  model.questions = questions;
  delete model.screening;

  res.json(model);
}

async function GET_question_entry(req: WikitruthRequest, res: WikitruthResponse) {
  const questionId = String(req.params.id || '').trim();

  if (!questionId) {
    return res.status(400).json({ error: 'Question id is required' });
  }

  const question = await questionsService.getQuestionEntry(questionId, req);

  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  const [answers, issues, opinions] = await Promise.all([
    db.Answer.find({
      $or: [
        { questionId: questionId },
        { ownerType: constants.OBJECT_TYPES.question, ownerId: questionId },
      ],
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Issue.find({
      ownerType: constants.OBJECT_TYPES.question,
      ownerId: questionId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Opinion.find({
      parentId: null,
      ownerType: constants.OBJECT_TYPES.question,
      ownerId: questionId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
  ]);

  await flowUtils.setEditorsUsername(answers);
  answers.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
  });

  await flowUtils.setEditorsUsername(issues);
  issues.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });

  await flowUtils.setEditorsUsername(opinions);
  opinions.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });

  res.json({
    question: question,
    answers: answers,
    issues: issues,
    opinions: opinions,
  });
}

function canEditEntry(entry: QuestionDocument | null, user: AuthUser | undefined): boolean {
  if (!entry || !user) {
    return false;
  }

  if (typeof user.canPlayRoleOf === 'function' && user.canPlayRoleOf('admin')) {
    return true;
  }

  return String(entry.createUserId || '') === String(user._id || user.id || '');
}

async function POST_question_create(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const body = (req.body || {}) as QuestionWriteBody;
  const title = String(body.title || '').trim();
  const description = String(body.description || body.content || '').trim();
  const references = String(body.references || '').trim();
  const ownerId = body.topicId || body.ownerId || req.query.topic || null;
  const groupId = body.groupId || null;
  const isPrivate = Boolean(body.private);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  const now = new Date();
  const question = await db.Question.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    references: references,
    friendlyUrl: utils.urlify(title),
    ownerType: constants.OBJECT_TYPES.topic,
    ownerId: ownerId,
    groupId: groupId,
    categoryId: ownerId,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    private: isPrivate,
  });

  res.status(201).json({
    success: true,
    question: {
      _id: question._id,
      title: question.title,
      friendlyUrl: question.friendlyUrl || utils.urlify(question.title || ''),
      content: question.content,
      references: question.references,
      ownerId: question.ownerId,
      private: question.private,
      createDate: question.createDate,
      editDate: question.editDate,
    },
  });
}

async function PUT_question_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const questionId = String(req.params.id || '').trim();
  if (!questionId) {
    return res.status(400).json({ error: 'Question id is required' });
  }

  const question = await db.Question.findById(questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  if (!canEditEntry(question, req.user)) {
    return res.status(403).json({ error: 'Not allowed to edit this question' });
  }

  const body = (req.body || {}) as QuestionWriteBody;

  if (typeof body.title !== 'undefined') {
    const title = String(body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    question.title = title;
    question.friendlyUrl = utils.urlify(title);
  }

  if (typeof body.description !== 'undefined' || typeof body.content !== 'undefined') {
    const content = String(body.description || body.content || '').trim();
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    question.content = content;
    question.contentPreview = content.slice(0, 240);
  }

  if (typeof body.references !== 'undefined') {
    question.references = String(body.references || '').trim();
  }

  if (typeof body.private !== 'undefined') {
    question.private = Boolean(body.private);
  }

  if (typeof body.topicId !== 'undefined' || typeof body.ownerId !== 'undefined') {
    question.ownerId = body.topicId || body.ownerId || null;
    question.categoryId = question.ownerId;
  }

  question.editDate = new Date();
  question.editUserId = req.user._id;
  await question.save();

  res.json({
    success: true,
    question: {
      _id: question._id,
      title: question.title,
      friendlyUrl: question.friendlyUrl || utils.urlify(question.title || ''),
      content: question.content,
      references: question.references,
      ownerId: question.ownerId,
      private: question.private,
      createDate: question.createDate,
      editDate: question.editDate,
    },
  });
}
