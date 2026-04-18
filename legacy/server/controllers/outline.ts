'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
let flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
  templates = require('../models/templates');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function(router) {

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/link', async function(req, res) {
    let model = {};
    await flowUtils.setArgumentModels(req, model);
    // @ts-ignore TS(2339): Property 'argument' does not exist on type '{}'.
    let query = model.argument ? { 'topic': model.argument.ownerId } : req.query;
    await flowUtils.setTopicModels({ query: query }, model);
    //var item = model.argument ? model.argument : model.topic;
    /*var parent = null;
    if(model.argument) {
    } else if(model.topic) {
    }*/
    res.render(templates.wiki.outline.linkTo, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/create', async function(req, res) {
    let model = {};
    await flowUtils.setTopicModels(req, model);
    await flowUtils.setArgumentModels(req, model);
    res.render(templates.wiki.outline.create, model);
  });
};
