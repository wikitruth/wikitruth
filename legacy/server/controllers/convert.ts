'use strict';

import type { LegacyControllerFactory } from '../../../server/src/types/legacyControllers';

import flowUtils from '../utils/flowUtils';
import constants from '../models/constants';
import templates from '../models/templates';
import app from '../app';

const db = (app as { db: { models: Record<string, { updateOne: (query: unknown, payload: unknown) => Promise<void> }> } }).db.models;

const mountConvertController: LegacyControllerFactory = function (router) {

  router.get('/', async function(req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model, { hideClipboard: true });
    model.cancelUrl = flowUtils.buildEntryReturnUrl(req, model) || flowUtils.buildReturnUrl(req, model.wikiBaseUrl || '/');
    model.hideEntryOptions = true;
    res.render(templates.wiki.convert, model);
  });

  router.post('/', async function(req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model);
    if (!model.entryType || !model.entry || !model.entry._id) {
      return res.redirect(flowUtils.buildReturnUrl(req, model.wikiBaseUrl || '/'));
    }
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

export default mountConvertController;
