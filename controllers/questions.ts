// @ts-nocheck
'use strict';

let mongoose = require('mongoose'),
  async = require('async'),
  utils = require('../utils/utils'),
  flowUtils = require('../utils/flowUtils'),
  paths = require('../models/paths'),
  templates = require('../models/templates'),
  constants = require('../models/constants'),
  db = require('../app').db.models;

module.exports = function(router) {
  /* Questions */

  router.get('/', async function(req, res) {
    await GET_index(req, res);
  });

  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await GET_entry(req, res);
  });

  router.get('/create', async function(req, res) {
    await GET_create(req, res);
  });

  router.post('/create', async function(req, res) {
    await POST_create(req, res);
  });
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;

async function GET_entry(req, res) {
  const model = {};
  flowUtils.ensureEntryIdParam(req, 'question');
  const ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
  await async.parallel(
    {
      answers: async function() {
        // Top Issues
        let results = await db.Answer.find({
          questionId: model.question._id,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        })
          .limit(15)
          .lean()
          .sort({ title: 1 });
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
        });
        model.answers = results;
      },
      issues: async function() {
        // Top Issues
        await flowUtils.getTopIssues(ownerQuery, model, req);
      },
      opinions: async function() {
        const query = {
          parentId: null,
          ownerId: req.query.question,
          ownerType: constants.OBJECT_TYPES.question,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        };
        await flowUtils.getTopOpinions(query, model, req);
      },
    },
  );
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.questions.entry, model);
}

async function GET_index(req, res) {
  let model = {};
  let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  if (model.topic) {
    flowUtils.setScreeningModel(req, model);
    let query = req.query.argument
      ? { ownerId: model.argument._id, ownerType: constants.OBJECT_TYPES.argument }
      : { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
    query['screening.status'] = model.screening.status;
    const results = await db.Question.find(query)
      .sort({ title: 1 })
      .lean();
    await flowUtils.setEditorsUsername(results);
    results.forEach(function(result) {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
    });
    model.questions = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    flowUtils.setScreeningModelCount(model, model.entry.childrenCount.questions);
    res.render(templates.wiki.questions.index, model);
  } else {
    // Top Questions
    let query = {
      ownerType: constants.OBJECT_TYPES.topic,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    };
    //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
    const results = await db.Question.find(query)
      .sort({ editDate: -1 })
      .limit(25)
      .lean();
    await flowUtils.setEditorsUsername(results);
    results.forEach(function(result) {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
    });
    model.questions = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.questions.index, model);
  }
}

async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.questions.create, model);
}

async function POST_create(req, res) {
  let query = { _id: req.query.question || new mongoose.Types.ObjectId() };
  const result = await db.Question.findOne(query);
  let dateNow = Date.now();
  let entity = result ? result : {};
  entity.title = req.body.title;
  entity.content = flowUtils.getEditorContent(req.body.content);
  entity.contentPreview = flowUtils.createContentPreview(entity.content);
  entity.references = flowUtils.getEditorContent(req.body.references);
  entity.friendlyUrl = utils.urlify(req.body.title);
  entity.editUserId = req.user.id;
  entity.editDate = dateNow;
  if (!result) {
    entity.createUserId = req.user.id;
    entity.createDate = dateNow;
    flowUtils.initScreeningStatus(req, entity);
  }
  if (!entity.ownerId) {
    if (req.query.argument) {
      entity.ownerId = req.query.argument;
      entity.ownerType = constants.OBJECT_TYPES.argument;
    } else if (req.query.topic) {
      // parent is a topic
      entity.ownerId = req.query.topic;
      entity.ownerType = constants.OBJECT_TYPES.topic;
    }
  }
  await flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.question });
  const updatedEntity = await db.Question.findOneAndUpdate(query, entity, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  if (!result) {
    // if new entry, update parent children count
    await flowUtils.updateChildrenCount(
      entity.ownerId,
      entity.ownerType,
      constants.OBJECT_TYPES.question,
    );
  }
  let model = {};
  flowUtils.setModelContext(req, res, model);
  let url =
    model.wikiBaseUrl +
    paths.wiki.questions.entry +
    '/' +
    updatedEntity.friendlyUrl +
    '/' +
    updatedEntity._id;
  res.redirect(url);
}
