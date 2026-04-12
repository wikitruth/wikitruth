'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
const utils = require('../../utils/utils');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const opinionsService = require('../../services/opinionsService');
const { applyViewModeFilter } = require('./viewFilter');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get opinions list
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_opinions(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get opinion entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_opinion_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create opinion entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    try {
      await POST_opinion_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/opinions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update opinion entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/entry/:id', async function (req, res) {
    try {
      await PUT_opinion_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/opinions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_opinions(req, res) {
  let model = {};
  flowUtils.setScreeningModel(req, model);
  
  const query = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
  };
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  applyViewModeFilter(req, query, model.screening.status);
  
  if (req.query.topic) {
    // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ owner... Remove this comment to see the full error message
    query.ownerId = req.query.topic;
  }
  
  const results = await opinionsService.getOpinionsList(query, { limit: 50 });
  
  // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{}'.
  model.opinions = results;
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_opinion_entry(req, res) {
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
  issues.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });

  await flowUtils.setEditorsUsername(opinions);
  opinions.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });

  res.json({
    opinion: opinion,
    issues: issues,
    opinions: opinions,
  });
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

async function POST_opinion_create(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const ownerId = req.body?.topicId || req.body?.ownerId || req.query?.topic || null;
  const parentId = req.body?.parentId || null;
  const isPrivate = Boolean(req.body?.private);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
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
  });

  res.status(201).json({
    success: true,
    opinion: {
      _id: opinion._id,
      title: opinion.title,
      friendlyUrl: opinion.friendlyUrl || utils.urlify(opinion.title),
      content: opinion.content,
      ownerId: opinion.ownerId,
      private: opinion.private,
      createDate: opinion.createDate,
      editDate: opinion.editDate,
    },
  });
}

async function PUT_opinion_update(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const opinion = await db.Opinion.findById(req.params.id);
  if (!opinion) {
    return res.status(404).json({ error: 'Opinion not found' });
  }
  if (!canEditEntry(opinion, req.user)) {
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
      createDate: opinion.createDate,
      editDate: opinion.editDate,
    },
  });
}
