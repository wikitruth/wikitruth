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
  router.get('/update', async function(req, res) {
    let model = {
      verdictStatus: constants.VERDICT_STATUS.pending,
    };
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model, { hideClipboard: true });
    // @ts-ignore TS(2339): Property 'entry' does not exist on type '{ verdict... Remove this comment to see the full error message
    if (model.entry && model.entry.verdict && model.entry.verdict.status) {
      // @ts-ignore TS(2339): Property 'entry' does not exist on type '{ verdict... Remove this comment to see the full error message
      model.verdictStatus = model.entry.verdict.status;
    }
    // @ts-ignore TS(2339): Property 'cancelUrl' does not exist on type '{ ver... Remove this comment to see the full error message
    model.cancelUrl = flowUtils.buildEntryReturnUrl(req, model);
    // @ts-ignore TS(2339): Property 'hideEntryOptions' does not exist on type... Remove this comment to see the full error message
    model.hideEntryOptions = true;
    res.render(templates.wiki.verdict.update, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
