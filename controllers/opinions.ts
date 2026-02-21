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
module.exports = function (router) {
  /* Opinions */

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
function shiftModels(req, model) {
  if (!req.query.id) {
    // shift models one step down
    if (model.parentOpinion) {
      model.grandParentOpinion = model.parentOpinion;
    }
    if (model.opinion) {
      model.parentOpinion = model.opinion;
      delete model.opinion;
    }
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_entry(req, res) {
  let model = {};
  flowUtils.ensureEntryIdParam(req, 'opinion');
  let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  let query = {
    // @ts-ignore TS(2339): Property 'opinion' does not exist on type '{}'.
    parentId: model.opinion._id,
    'screening.status': constants.SCREENING_STATUS.status1.code,
  };
  await async.parallel({
    issues: async () => {
      // Top Issues
      ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
      await flowUtils.getTopIssues(ownerQuery, model, req);
    },
    opinions: async () => {
      await flowUtils.getTopOpinions(query, model, req);
    },
  });
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.opinions.entry, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_index(req, res) {
  const model = {};
  const query = flowUtils.createOwnerQueryFromQuery(req);
  if (query.ownerId) {
    flowUtils.setScreeningModel(req, model);
    await flowUtils.setEntryModels(query, req, model);
    //query = flowUtils.createOwnerQueryFromModel(model);
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    query['screening.status'] = model.screening.status;
    let results = await db.Opinion.find(query).sort({ title: 1 }).lean();
    await flowUtils.setEditorsUsername(results);
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(result => {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
    });
    // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{}'.
    model.opinions = results;
    flowUtils.setModelOwnerEntry(req, res, model);
    // screening and children count
    // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
    flowUtils.setScreeningModelCount(model, model.entry.childrenCount.opinions);
    res.render(templates.wiki.opinions.index, model);
  } else {
    // Top Opinions
    let results = await db.Opinion.find({
      ownerType: constants.OBJECT_TYPES.topic,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    })
      .limit(100)
      .lean();
    await flowUtils.setEditorsUsername(results);
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(result => {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
    });
    // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{}'.
    model.opinions = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.opinions.index, model);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_create(req, res) {
  const model = {};
  if (req.query.id) {
    req.query.opinion = req.query.id;
  }
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  shiftModels(req, model);
  // @ts-ignore TS(2339): Property 'opinion' does not exist on type '{}'.
  if (model.opinion && !flowUtils.isEntryOwner(req, model.opinion)) {
    return res.redirect('/');
  }
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.opinions.create, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function POST_create(req, res) {
  let model = {};
  if (req.query.id) {
    req.query.opinion = req.query.id;
  }
  await flowUtils.setOpinionModel(req, model);
  shiftModels(req, model);

  const dateNow = Date.now();
  // @ts-ignore TS(2339): Property 'opinion' does not exist on type '{}'.
  const entity = model.opinion ? model.opinion : {};
  entity.title = req.body.title;
  entity.content = flowUtils.getEditorContent(req.body.content);
  entity.contentPreview = flowUtils.createContentPreview(entity.content);
  entity.friendlyUrl = utils.urlify(req.body.title);
  entity.editUserId = req.user.id;
  entity.editDate = dateNow;
  // @ts-ignore TS(2339): Property 'opinion' does not exist on type '{}'.
  if (!model.opinion) {
    entity.createUserId = req.user.id;
    entity.createDate = dateNow;
    flowUtils.initScreeningStatus(req, entity);
  }
  // @ts-ignore TS(2339): Property 'parentOpinion' does not exist on type '{... Remove this comment to see the full error message
  if (model.parentOpinion) {
    // A child opinion
    // @ts-ignore TS(2339): Property 'parentOpinion' does not exist on type '{... Remove this comment to see the full error message
    const parent = model.parentOpinion;
    entity.parentId = parent._id;
    entity.ownerId = parent.ownerId;
    entity.ownerType = parent.ownerType;
  } else if (!entity.ownerId) {
    // A new root opinion.
    delete req.query.opinion;
    const q = flowUtils.createOwnerQueryFromQuery(req);
    entity.parentId = null;
    entity.ownerId = q.ownerId;
    entity.ownerType = q.ownerType;
  }
  await flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.opinion });
  const query = { _id: req.query.id || new mongoose.Types.ObjectId() };
  const updatedEntity = await db.Opinion.findOneAndUpdate(query, entity, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  // @ts-ignore TS(2339): Property 'opinion' does not exist on type '{}'.
  if (!model.opinion) {
    // if new entry, update parent count
    if (entity.parentId) {
      // parent is always an opinion object
      await flowUtils.updateChildrenCount(
        entity.parentId,
        constants.OBJECT_TYPES.opinion,
        constants.OBJECT_TYPES.opinion
      );
    } else {
      // parent can be anything
      await flowUtils.updateChildrenCount(
        entity.ownerId,
        entity.ownerType,
        constants.OBJECT_TYPES.opinion
      );
    }
  }
  model = {};
  flowUtils.setModelContext(req, res, model);
  const url =
    // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
    model.wikiBaseUrl +
    paths.wiki.opinions.entry +
    '/' +
    updatedEntity.friendlyUrl +
    '/' +
    updatedEntity._id;
  res.redirect(url);
}
