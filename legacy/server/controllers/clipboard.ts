'use strict';

let templates = require('../models/templates'),
  constants = require('../models/constants'),
  flowUtils = require('../utils/flowUtils'),
  db = require('../app').db.models,
  async = require('async');

module.exports = function(router) {

  router.get('/', async function(req, res) {
    let model = {};
    let clipboard = req.session.clipboard || {};
    let topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
    let argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];
    let questionIds = clipboard['object' + constants.OBJECT_TYPES.question];
    let artifactIds = clipboard['object' + constants.OBJECT_TYPES.artifact];

    /* FIXME: why is this here?
    if(req.user) {
        req.params.username = req.user.username;
    }*/
    flowUtils.setModelContext(req, res, model, true);

    await async.parallel({
      topics: async function() {
        if (topicIds && topicIds.length > 0) {
          let query = {
            _id: {
              $in: topicIds,
            },
          };
          const results = await db.Topic.find(query);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          model.topics = results;
        }
      },
      arguments: async function() {
        if (argumentIds && argumentIds.length > 0) {
          let query = {
            _id: {
              $in: argumentIds,
            },
          };
          const results = await db.Argument.find(query);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          model.arguments = results;
        }
      },
      questions: async function() {
        if (questionIds && questionIds.length > 0) {
          let query = {
            _id: {
              $in: questionIds,
            },
          };
          const results = await db.Question.find(query);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          model.questions = results;
        }
      },
      artifacts: async function() {
        if (artifactIds && artifactIds.length > 0) {
          let query = {
            _id: {
              $in: artifactIds,
            },
          };
          const results = await db.Artifact.find(query);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          model.artifacts = results;
        }
      },
    });
    res.render(templates.wiki.clipboard, model);
  });

  router.post('/', function(req, res) {
    let action = req.body.action;
    if (action === 'delete') {
      //let clipboard = req.session.clipboard;
      let topics = req.body.topics;
      let args = req.body.arguments;
      //let artifacts = req.body.artifacts;
      if (topics) {
        //let topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
        if (typeof topics === 'string') {
          // single selection
          topics = [topics];
        }
      }
      if (args) {
        //let argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];
        if (typeof args === 'string') {
          // single selection
          args = [args];
        }
      }
      res.redirect(req.originalUrl);
    }
  });
};
