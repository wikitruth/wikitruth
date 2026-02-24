'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
const async = require('async');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
const utils = require('../../utils/utils');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const questionsService = require('../../services/questionsService');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get questions list
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_questions(req, res);
    } catch (error) {
      console.error('Error in GET /api/questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get question entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_question_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/questions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create question entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    try {
      await POST_question_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update question entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/entry/:id', async function (req, res) {
    try {
      await PUT_question_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/questions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_questions(req, res) {
  let model = {};
  flowUtils.setScreeningModel(req, model);
  
  const query = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    'screening.status': model.screening.status,
  };
  
  if (req.query.topic) {
    // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ owner... Remove this comment to see the full error message
    query.ownerId = req.query.topic;
  }
  
  const questionsList = await questionsService.getQuestionsList(query, {
    limit: 50,
    req: req,
  });
  
  // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
  model.questions = questionsList;
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_question_entry(req, res) {
  const question = await questionsService.getQuestionEntry(req.params.id, req);
  
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  
  res.json({ question });
}

function canEditEntry(entry: any, user: any): boolean {
  if (!entry || !user) {
    return false;
  }
  if (user.canPlayRoleOf && user.canPlayRoleOf('admin')) {
    return true;
  }
  return String(entry.createUserId || '') === String(user._id || user.id || '');
}

async function POST_question_create(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const references = String(req.body?.references || '').trim();
  const ownerId = req.body?.topicId || req.body?.ownerId || req.query?.topic || null;
  const isPrivate = Boolean(req.body?.private);

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
      friendlyUrl: question.friendlyUrl || utils.urlify(question.title),
      content: question.content,
      references: question.references,
      ownerId: question.ownerId,
      private: question.private,
      createDate: question.createDate,
      editDate: question.editDate,
    },
  });
}

async function PUT_question_update(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const question = await db.Question.findById(req.params.id);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  if (!canEditEntry(question, req.user)) {
    return res.status(403).json({ error: 'Not allowed to edit this question' });
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = String(req.body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    question.title = title;
    question.friendlyUrl = utils.urlify(title);
  }

  if (typeof req.body?.description !== 'undefined' || typeof req.body?.content !== 'undefined') {
    const content = String(req.body?.description || req.body?.content || '').trim();
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    question.content = content;
    question.contentPreview = content.slice(0, 240);
  }

  if (typeof req.body?.references !== 'undefined') {
    question.references = String(req.body.references || '').trim();
  }

  if (typeof req.body?.private !== 'undefined') {
    question.private = Boolean(req.body.private);
  }

  if (typeof req.body?.topicId !== 'undefined' || typeof req.body?.ownerId !== 'undefined') {
    question.ownerId = req.body.topicId || req.body.ownerId || null;
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
      friendlyUrl: question.friendlyUrl || utils.urlify(question.title),
      content: question.content,
      references: question.references,
      ownerId: question.ownerId,
      private: question.private,
      createDate: question.createDate,
      editDate: question.editDate,
    },
  });
}
