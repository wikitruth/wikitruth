// @ts-nocheck
'use strict';

let flowUtils = require('../utils/flowUtils'),
  templates = require('../models/templates');

module.exports = function(router) {

  router.get('/link', async function(req, res) {
    let model = {};
    await flowUtils.setArgumentModels(req, model);
    let query = model.argument ? { 'topic': model.argument.ownerId } : req.query;
    await flowUtils.setTopicModels({ query: query }, model);
    //var item = model.argument ? model.argument : model.topic;
    /*var parent = null;
    if(model.argument) {
    } else if(model.topic) {
    }*/
    res.render(templates.wiki.outline.linkTo, model);
  });

  router.get('/create', async function(req, res) {
    let model = {};
    await flowUtils.setTopicModels(req, model);
    await flowUtils.setArgumentModels(req, model);
    res.render(templates.wiki.outline.create, model);
  });
};
