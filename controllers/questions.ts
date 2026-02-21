// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let mongoose = require('mongoose'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  async = require('async'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  utils = require('../utils/utils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  paths = require('../models/paths'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function(router) {
  /* Questions */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function(req, res) {
    await GET_index(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/create', async function(req, res) {
    await GET_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/create', async function(req, res) {
    await POST_create(req, res);
  });
};

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_entry = GET_entry;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_index = GET_index;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_create = GET_create;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.POST_create = POST_create;

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
          // @ts-ignore TS(2339): Property 'question' does not exist on type '{}'.
          questionId: model.question._id,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        })
          .limit(15)
          .lean()
          .sort({ title: 1 });
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
        });
        // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
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

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_index(req, res) {
  let model = {};
  let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (model.topic) {
    flowUtils.setScreeningModel(req, model);
    let query = req.query.argument
      // @ts-ignore TS(2339): Property 'argument' does not exist on type '{}'.
      ? { ownerId: model.argument._id, ownerType: constants.OBJECT_TYPES.argument }
      // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
      : { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
    // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    query['screening.status'] = model.screening.status;
    const results = await db.Question.find(query)
      .sort({ title: 1 })
      .lean();
    await flowUtils.setEditorsUsername(results);
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function(result) {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
    });
    // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
    model.questions = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
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
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function(result) {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
    });
    // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
    model.questions = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.questions.index, model);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.questions.create, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
    // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
    model.wikiBaseUrl +
    paths.wiki.questions.entry +
    '/' +
    updatedEntity.friendlyUrl +
    '/' +
    updatedEntity._id;
  res.redirect(url);
}
