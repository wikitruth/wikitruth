'use strict';

import type { LegacyControllerFactory } from '../../../server/src/types/legacyControllers';

import mongoose from 'mongoose';
import async from 'async';

import utils from '../utils/utils';
import flowUtils from '../utils/flowUtils';
import paths from '../models/paths';
import templates from '../models/templates';
import constants from '../models/constants';
import app from '../app';

const db = app.db.models;

const mountIssuesController: LegacyControllerFactory = function (router) {
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

async function GET_index(req, res) {
  let model = {};
  let query = flowUtils.createOwnerQueryFromQuery(req);
  if (query.ownerId) {
    flowUtils.setScreeningModel(req, model);
    await flowUtils.setEntryModels(query, req, model);
    query['screening.status'] = model.screening.status;
    const results = await db.Issue.find(query).sort({ title: 1 }).lean();
    await flowUtils.setEditorsUsername(results);
    results.forEach(function (result) {
      result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
    });
    model.issues = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
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
    results.forEach(function (result) {
      result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
    });
    model.issues = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.issues.index, model);
  }
}

async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.issues.create, model);
}

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

export { GET_entry, GET_index, GET_create, POST_create };
export default mountIssuesController;
