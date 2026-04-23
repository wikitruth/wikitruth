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
  /* Opinions */

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

async function GET_entry(req, res) {
  let model = {};
  flowUtils.ensureEntryIdParam(req, 'opinion');
  let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  let query = {
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

async function GET_index(req, res) {
  const model = {};
  const query = flowUtils.createOwnerQueryFromQuery(req);
  if (query.ownerId) {
    flowUtils.setScreeningModel(req, model);
    await flowUtils.setEntryModels(query, req, model);
    //query = flowUtils.createOwnerQueryFromModel(model);
    query['screening.status'] = model.screening.status;
    let results = await db.Opinion.find(query).sort({ title: 1 }).lean();
    await flowUtils.setEditorsUsername(results);
    results.forEach(result => {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
    });
    model.opinions = results;
    flowUtils.setModelOwnerEntry(req, res, model);
    // screening and children count
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
    results.forEach(result => {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
    });
    model.opinions = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.opinions.index, model);
  }
}

async function GET_create(req, res) {
  const model = {};
  if (req.query.id) {
    req.query.opinion = req.query.id;
  }
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  shiftModels(req, model);
  if (model.opinion && !flowUtils.isEntryOwner(req, model.opinion)) {
    return res.redirect('/');
  }
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.opinions.create, model);
}

async function POST_create(req, res) {
  let model = {};
  if (req.query.id) {
    req.query.opinion = req.query.id;
  }
  await flowUtils.setOpinionModel(req, model);
  shiftModels(req, model);

  const dateNow = Date.now();
  const entity = model.opinion ? model.opinion : {};
  entity.title = req.body.title;
  entity.content = flowUtils.getEditorContent(req.body.content);
  entity.contentPreview = flowUtils.createContentPreview(entity.content);
  entity.friendlyUrl = utils.urlify(req.body.title);
  entity.editUserId = req.user.id;
  entity.editDate = dateNow;
  if (!model.opinion) {
    entity.createUserId = req.user.id;
    entity.createDate = dateNow;
    flowUtils.initScreeningStatus(req, entity);
  }
  if (model.parentOpinion) {
    // A child opinion
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
    model.wikiBaseUrl +
    paths.wiki.opinions.entry +
    '/' +
    updatedEntity.friendlyUrl +
    '/' +
    updatedEntity._id;
  res.redirect(url);
}
