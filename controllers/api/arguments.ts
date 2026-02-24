'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
const async = require('async');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
const utils = require('../../utils/utils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const argumentsService = require('../../services/argumentsService');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get arguments list
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_arguments(req, res);
    } catch (error) {
      console.error('Error in GET /api/arguments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create argument entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    try {
      await POST_argument_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/arguments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get argument entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_argument_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/arguments/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_arguments(req, res) {
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
  
  const argumentsList = await argumentsService.getArgumentsList(query, {
    limit: 50,
    req: req,
  });
  
  // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
  model.arguments = argumentsList;
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_argument_entry(req, res) {
  const argument = await argumentsService.getArgumentEntry(req.params.id, req);
  
  if (!argument) {
    return res.status(404).json({ error: 'Argument not found' });
  }
  
  res.json({ argument });
}

async function POST_argument_create(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const references = String(req.body?.sources || req.body?.references || '').trim();
  const ownerId = req.body?.topicId || req.body?.ownerId || req.query?.topic || null;
  const ownerType = constants.OBJECT_TYPES.topic;
  const isPrivate = Boolean(req.body?.private);
  const typeId = constants.ARGUMENT_TYPES.factual;
  const verdictStatus = constants.VERDICT_STATUS.pending;

  if (!title || title.length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters' });
  }

  if (!description || description.length < 20) {
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  }

  const now = new Date();
  const argument = await db.Argument.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    references: references,
    friendlyUrl: utils.urlify(title),
    ownerType: ownerType,
    ownerId: ownerId,
    typeId: typeId,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    verdict: {
      status: verdictStatus,
      editDate: now,
      editUserId: req.user._id,
    },
    private: isPrivate,
  });

  res.status(201).json({
    success: true,
    argument: {
      _id: argument._id,
      title: argument.title,
      friendlyUrl: argument.friendlyUrl || utils.urlify(argument.title),
      content: argument.content,
      ownerId: argument.ownerId,
      ownerType: argument.ownerType,
      private: argument.private,
      createDate: argument.createDate,
      editDate: argument.editDate,
    },
  });
}
