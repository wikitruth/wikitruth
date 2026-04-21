'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
let flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
  utils = require('../utils/utils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'paths'.
  paths = require('../models/paths');

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function createReturnUrl(req, model) {
  const fallback = (model && model.wikiBaseUrl ? model.wikiBaseUrl : '') + (paths && paths.wiki ? paths.wiki.index : '/explore');

  try {
    if (!model || !model.ownerType || !model.entry || !paths || !paths.wiki) {
      return fallback;
    }

    switch (model.ownerType) {
      case constants.OBJECT_TYPES.topicLink:
        if (!paths.wiki.topics || !paths.wiki.topics.entry) {
          return fallback;
        }
        return (
          model.wikiBaseUrl +
          paths.wiki.topics.entry +
          '/' +
          utils.urlify(model.entry.title2) +
          '/link/' +
          model.entry._id
        );
      case constants.OBJECT_TYPES.argumentLink:
        if (!paths.wiki.arguments || !paths.wiki.arguments.entry) {
          return fallback;
        }
        return (
          model.wikiBaseUrl +
          paths.wiki.arguments.entry +
          '/' +
          utils.urlify(model.entry.title2) +
          '/link/' +
          model.entry._id
        );
      default:
        if (
          !constants.OBJECT_NAMES_MAP[model.ownerType] ||
          !paths.wiki[constants.OBJECT_NAMES_MAP[model.ownerType]] ||
          !paths.wiki[constants.OBJECT_NAMES_MAP[model.ownerType]].entry
        ) {
          return fallback;
        }

        return (
          model.wikiBaseUrl +
          paths.wiki[constants.OBJECT_NAMES_MAP[model.ownerType]].entry +
          '/' +
          utils.urlify(model.entry.title) +
          '/' +
          model.entry._id
        );
    }
  } catch (_err) {
    return fallback;
  }
}

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model);
    // @ts-ignore TS(2339): Property 'ownerType' does not exist on type '{}'.
    model.ownerType = ownerQuery.ownerType;
    // @ts-ignore TS(2339): Property 'cancelUrl' does not exist on type '{}'.
    model.cancelUrl = createReturnUrl(req, model);
    res.render(templates.wiki.screening, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model);
    // @ts-ignore TS(2339): Property 'ownerType' does not exist on type '{}'.
    model.ownerType = ownerQuery.ownerType;
    let screeningStatus = req.body.screeningStatus;
    let dbModel = flowUtils.getDbModelByObjectType(ownerQuery.ownerType);
    if (dbModel) {
      await dbModel.updateOne(
        // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
        { _id: model.entry._id },
        {
          $set: {
            'screening.status': screeningStatus,
          },
        }
      );
      // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
      let parent = flowUtils.getParent(model.entry, ownerQuery.ownerType);
      if (parent) {
        await flowUtils.updateChildrenCount(parent.entryId, parent.entryType, ownerQuery.ownerType);
      }
      res.redirect(createReturnUrl(req, model));
    } else {
      return res.status(500).send({ error: 'Invalid db model.' });
    }
  });
};
