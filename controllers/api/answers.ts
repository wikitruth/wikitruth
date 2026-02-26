'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
const utils = require('../../utils/utils');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const answersService = require('../../services/answersService');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // GET /api/answers - List answers
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      const model = {};
      flowUtils.setScreeningModel(req, model);
      
      const query = {
        ownerType: constants.OBJECT_TYPES.question,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      
      if (req.query.question) {
        // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ owner... Remove this comment to see the full error message
        query.ownerId = req.query.question;
      }
      
      const results = await answersService.getAnswersList(query, { limit: 50 });
      // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
      model.answers = results;
      
      // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
      delete model.screening;
      res.json(model);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/answers/entry/:id - Get single answer
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      const answerId = String(req.params.id || '').trim();
      if (!answerId) {
        return res.status(400).json({ error: 'Answer id is required' });
      }

      const answer = await answersService.getAnswerEntry(req.params.id, req);
      
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }

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
      issues.forEach(function (result: any) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
      });

      await flowUtils.setEditorsUsername(opinions);
      opinions.forEach(function (result: any) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
      });

      res.json({
        answer: answer,
        issues: issues,
        opinions: opinions,
      });
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/answers - Create answer
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    try {
      await POST_answer_create(req, res);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/answers/entry/:id - Update answer
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/entry/:id', async function (req, res) {
    try {
      await PUT_answer_update(req, res);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });
};

function canEditEntry(entry: any, user: any): boolean {
  if (!entry || !user) {
    return false;
  }
  if (user.canPlayRoleOf && user.canPlayRoleOf('admin')) {
    return true;
  }
  return String(entry.createUserId || '') === String(user._id || user.id || '');
}

async function POST_answer_create(req: any, res: any) {
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

async function PUT_answer_update(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const answer = await db.Answer.findById(req.params.id);
  if (!answer) {
    return res.status(404).json({ error: 'Answer not found' });
  }
  if (!canEditEntry(answer, req.user)) {
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
