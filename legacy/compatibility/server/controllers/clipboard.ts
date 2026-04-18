'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
let templates = require('../models/templates'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
  db = require('../app').db.models,
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
  async = require('async');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function(router) {

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
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
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
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
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
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
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result);
          });
          // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
          model.artifacts = results;
        }
      },
    });
    res.render(templates.wiki.clipboard, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
