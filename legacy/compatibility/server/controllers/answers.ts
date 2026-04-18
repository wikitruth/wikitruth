// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let mongoose = require('mongoose'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
  async = require('async'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
  utils = require('../utils/utils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'paths'.
  paths = require('../models/paths'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
  db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  /* Answers */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    await GET_index(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/create', async function (req, res) {
    await GET_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/create', async function (req, res) {
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

// @ts-ignore TS(2393): Duplicate function implementation.
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

// @ts-ignore TS(2393): Duplicate function implementation.
async function GET_index(req, res) {
  const model = {};
  let query = flowUtils.createOwnerQueryFromQuery(req);
  if (query.ownerId) {
    flowUtils.setScreeningModel(req, model);
    flowUtils.setEntryModels(query, req, model);
    let results = await db.Answer.find({
      // @ts-ignore TS(2339): Property 'question' does not exist on type '{}'.
      questionId: model.question._id,
      // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
      'screening.status': model.screening.status,
    })
      .sort({ title: 1 })
      .lean();
    await flowUtils.setEditorsUsername(results);
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function (result) {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
    });
    // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
    model.answers = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
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
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function (result) {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
    });
    // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
    model.answers = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.answers.index, model);
  }
}

// @ts-ignore TS(2393): Duplicate function implementation.
async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.answers.create, model);
}

// @ts-ignore TS(2393): Duplicate function implementation.
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
    // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
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
