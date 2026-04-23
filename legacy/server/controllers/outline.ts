'use strict';

import type { LegacyControllerFactory } from '../../../server/src/types/legacyControllers';
import type { FlowUtilsModule } from '../../../server/src/types/legacyModules';

import templates = require('../models/templates');
import flowUtilsMod = require('../utils/flowUtils');

const flowUtils = flowUtilsMod as FlowUtilsModule;

const mountOutlineController: LegacyControllerFactory = function (router) {

  router.get('/link', async function(req, res) {
    const model: Record<string, unknown> = {};
    await flowUtils.setArgumentModels(req, model);
    const modelWithArgument = model as { argument?: { ownerId?: unknown } };
    const query = modelWithArgument.argument ? { topic: modelWithArgument.argument.ownerId } : req.query;
    await flowUtils.setTopicModels({ query: query }, model);
    //var item = model.argument ? model.argument : model.topic;
    /*var parent = null;
    if(model.argument) {
    } else if(model.topic) {
    }*/
    res.render(templates.wiki.outline.linkTo, model);
  });

  router.get('/create', async function(req, res) {
    const model: Record<string, unknown> = {};
    await flowUtils.setTopicModels(req, model);
    await flowUtils.setArgumentModels(req, model);
    res.render(templates.wiki.outline.create, model);
  });
};

export default mountOutlineController;
