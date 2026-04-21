'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
let flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
  db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function(router) {

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function(req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model, { hideClipboard: true });
    // @ts-ignore TS(2339): Property 'cancelUrl' does not exist on type '{}'.
    model.cancelUrl = flowUtils.buildEntryReturnUrl(req, model) || flowUtils.buildReturnUrl(req, model.wikiBaseUrl || '/');
    // @ts-ignore TS(2339): Property 'hideEntryOptions' does not exist on type... Remove this comment to see the full error message
    model.hideEntryOptions = true;
    res.render(templates.wiki.convert, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function(req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model);
    // @ts-ignore TS(2339): Property 'entryType' does not exist on type '{}'.
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
    // @ts-ignore TS(2339): Property 'entryType' does not exist on type '{}'.
    switch (model.entryType) {
      case constants.OBJECT_TYPES.topic:
        // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
        await db.Topic.updateOne({ _id: model.entry._id }, updateQuery);
        break;
      case constants.OBJECT_TYPES.argument:
        // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
        await db.Argument.updateOne({ _id: model.entry._id }, updateQuery);
        break;
    }
    res.redirect(flowUtils.buildEntryReturnUrl(req, model));
  });
};
