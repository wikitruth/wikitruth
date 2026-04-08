// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const mongoose = require('mongoose'),
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
module.exports = function (router) {
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

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_entry(req, res) {
  let model = {};
  flowUtils.ensureEntryIdParam(req, 'issue');
  let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
  ownerQuery.parentId = null;
  await async.parallel({
    opinions: async function () {
      await flowUtils.getTopOpinions(ownerQuery, model, req);
    },
  });
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.issues.entry, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_index(req, res) {
  let model = {};
  let query = flowUtils.createOwnerQueryFromQuery(req);
  if (query.ownerId) {
    flowUtils.setScreeningModel(req, model);
    await flowUtils.setEntryModels(query, req, model);
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    query['screening.status'] = model.screening.status;
    const results = await db.Issue.find(query).sort({ title: 1 }).lean();
    await flowUtils.setEditorsUsername(results);
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function (result) {
      result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
    });
    // @ts-ignore TS(2339): Property 'issues' does not exist on type '{}'.
    model.issues = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
    flowUtils.setScreeningModelCount(model, model.entry.childrenCount.issues);
    res.render(templates.wiki.issues.index, model);
  } else {
    // Top Issues
    const results = await db.Issue.find({
      ownerType: constants.OBJECT_TYPES.topic,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    })
      .limit(100)
      .lean();
    await flowUtils.setEditorsUsername(results);
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function (result) {
      result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
    });
    // @ts-ignore TS(2339): Property 'issues' does not exist on type '{}'.
    model.issues = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.issues.index, model);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.issues.create, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function POST_create(req, res) {
  let query = { _id: req.query.issue || new mongoose.Types.ObjectId() };
  const result = await db.Issue.findOne(query);
  let dateNow = Date.now();
  let entity = result ? result : {};
  entity.title = req.body.title;
  entity.content = flowUtils.getEditorContent(req.body.content);
  entity.contentPreview = flowUtils.createContentPreview(entity.content);
  entity.friendlyUrl = utils.urlify(req.body.title);
  entity.issueType = req.body.issueType;
  entity.editUserId = req.user.id;
  entity.editDate = dateNow;
  if (!result) {
    entity.createUserId = req.user.id;
    entity.createDate = dateNow;
    flowUtils.initScreeningStatus(req, entity);
  }
  if (!entity.ownerId) {
    delete req.query.issue;
    let q = flowUtils.createOwnerQueryFromQuery(req);
    entity.ownerId = q.ownerId;
    entity.ownerType = q.ownerType;
  }
  await flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.issue });
  const updatedEntity = await db.Issue.findOneAndUpdate(query, entity, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  let updateRedirect = function () {
    let model = {};
    flowUtils.setModelContext(req, res, model);
    let url =
      // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
      model.wikiBaseUrl +
      paths.wiki.issues.entry +
      '/' +
      updatedEntity.friendlyUrl +
      '/' +
      updatedEntity._id;
    res.redirect(url);
  };
  if (!result) {
    // if new entry, update parent children count
    await flowUtils.updateChildrenCount(
      entity.ownerId,
      entity.ownerType,
      constants.OBJECT_TYPES.issue
    );
  }
  updateRedirect();
}
