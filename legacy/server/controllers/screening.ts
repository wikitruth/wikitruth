'use strict';

import type { LegacyControllerFactory } from '../../../server/src/types/legacyControllers';

import flowUtils from '../utils/flowUtils';
import * as utils from '../utils/utils';
import constants from '../models/constants';
import templates from '../models/templates';
import paths from '../models/paths';

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

const mountScreeningController: LegacyControllerFactory = function (router) {
  router.get('/', async function (req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model);
    model.ownerType = ownerQuery.ownerType;
    model.cancelUrl = createReturnUrl(req, model);
    res.render(templates.wiki.screening, model);
  });

  router.post('/', async function (req, res) {
    let model = {};
    let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    await flowUtils.setEntryModels(ownerQuery, req, model);
    flowUtils.setModelOwnerEntry(req, res, model);
    model.ownerType = ownerQuery.ownerType;
    let screeningStatus = req.body.screeningStatus;
    let dbModel = flowUtils.getDbModelByObjectType(ownerQuery.ownerType);
    if (dbModel) {
      await dbModel.updateOne(
        { _id: model.entry._id },
        {
          $set: {
            'screening.status': screeningStatus,
          },
        }
      );
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

export default mountScreeningController;
