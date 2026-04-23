'use strict';

import type { LegacyControllerFactory } from '../../../server/src/types/legacyControllers';

import flowUtils = require('../utils/flowUtils');
import constants = require('../models/constants');
import templates = require('../models/templates');
import app = require('../app');

const db = (app as { db: { models: Record<string, { updateOne: (query: unknown, payload: unknown) => Promise<void> }> } }).db.models;

const mountVerdictController: LegacyControllerFactory = function (router) {

  router.get('/update', async function(req, res) {
    let model = {
      verdictStatus: constants.VERDICT_STATUS.pending,
    };
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model, { hideClipboard: true });
    if (model.entry && model.entry.verdict && model.entry.verdict.status) {
      model.verdictStatus = model.entry.verdict.status;
    }
    model.cancelUrl = flowUtils.buildEntryReturnUrl(req, model);
    model.hideEntryOptions = true;
    res.render(templates.wiki.verdict.update, model);
  });

  router.post('/update', async function(req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model);
    let updateQuery = {
      $set: {
        verdict: {
          status: req.body.verdictStatus,
          editDate: Date.now(),
          editUserId: req.user.id,
        },
      },
    };
    switch (model.entryType) {
      case constants.OBJECT_TYPES.topic:
        await db.Topic.updateOne({ _id: model.entry._id }, updateQuery);
        break;
      case constants.OBJECT_TYPES.argument:
        await db.Argument.updateOne({ _id: model.entry._id }, updateQuery);
        break;
    }
    res.redirect(flowUtils.buildEntryReturnUrl(req, model));
  });
};

export default mountVerdictController;
