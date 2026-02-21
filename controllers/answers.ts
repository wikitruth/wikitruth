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

module.exports = function (router) {
  /* Answers */

  router.get('/', async function (req, res) {
    await GET_index(req, res);
  });

  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await GET_entry(req, res);
  });

  router.get('/create', async function (req, res) {
    await GET_create(req, res);
  });

  router.post('/create', async function (req, res) {
    await POST_create(req, res);
  });
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;

async function GET_entry(req, res) {
  let model = {};
  flowUtils.ensureEntryIdParam(req, 'answer');
  let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
  await async.parallel({
    issues: async function () {
      await flowUtils.getTopIssues(ownerQuery, model, req);
    },
    opinions: async function () {
      let query = {
        parentId: null,
        ownerId: req.query.answer,
        ownerType: constants.OBJECT_TYPES.answer,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopOpinions(query, model, req);
    },
  });
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.answers.entry, model);
}

async function GET_index(req, res) {
  const model = {};
  let query = flowUtils.createOwnerQueryFromQuery(req);
  if (query.ownerId) {
    flowUtils.setScreeningModel(req, model);
    flowUtils.setEntryModels(query, req, model);
    let results = await db.Answer.find({
      questionId: model.question._id,
      'screening.status': model.screening.status,
    })
      .sort({ title: 1 })
      .lean();
    await flowUtils.setEditorsUsername(results);
    results.forEach(function (result) {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
    });
    model.answers = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    flowUtils.setScreeningModelCount(model, model.entry.childrenCount.answers);
    res.render(templates.wiki.answers.index, model);
  } else {
    // Top Answers
    query = {
      ownerType: constants.OBJECT_TYPES.topic,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    };
    //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
    let results = await db.Answer.find(query).sort({ editDate: -1 }).limit(25).lean().exec();
    await flowUtils.setEditorsUsername(results);
    results.forEach(function (result) {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
    });
    model.answers = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.answers.index, model);
  }
}

async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.answers.create, model);
}

async function POST_create(req, res) {
  let query = { _id: req.query.answer || new mongoose.Types.ObjectId() };
  const result = await db.Answer.findOne(query);
  let entity = result ? result : {};
  let dateNow = Date.now();
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
    entity.questionId = req.query.question;
    flowUtils.initScreeningStatus(req, entity);
  }
  await flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.answer });
  const updatedEntity = await db.Answer.findOneAndUpdate(query, entity, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  if (!result) {
    // if new entry, update parent children count
    await flowUtils.updateChildrenCount(
      updatedEntity.questionId,
      constants.OBJECT_TYPES.question,
      constants.OBJECT_TYPES.answer
    );
  }
  let model = {};
  flowUtils.setModelContext(req, res, model);
  let url =
    model.wikiBaseUrl +
    paths.wiki.answers.entry +
    '/' +
    updatedEntity.friendlyUrl +
    '/' +
    updatedEntity._id;
  res.redirect(url);
  /*res.redirect((result ? paths.wiki.answers.entry : paths.wiki.answers.index) +
   '?topic=' + req.query.topic +
   (req.query.argument ? '&argument=' + req.query.argument : '') +
   (result ? '&answer=' + req.query.answer : '')
   );*/
}
