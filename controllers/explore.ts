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
    // @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
    let injectCategoryId = function(query) {
      if (res.locals.application) {
        query.categoryId = res.locals.application.exploreTopicId;
      }
    };

    let LIMIT = req.query.tab ? 25 : 15;
    let allTabs = !req.query.tab;
    let tab = req.query.tab ? req.query.tab : 'all';
    let model = {
      tab: tab,
    };
    flowUtils.setScreeningModel(req, model);
    flowUtils.setModelContext(req, res, model);
    await async.parallel({
      topics: async function() {
        if (!allTabs && model.tab !== 'topics') {
          return;
        }
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{ tab... Remove this comment to see the full error message
        let query = { parentId: { $ne: null }, private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        let results = await db.Topic
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT);

        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
        });
        // @ts-ignore TS(2339): Property 'topics' does not exist on type '{ tab: a... Remove this comment to see the full error message
        model.topics = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'topicsMore' does not exist on type '{ ta... Remove this comment to see the full error message
            model.topicsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      arguments: async function() {
        if (!allTabs && model.tab !== 'arguments') {
          return;
        }
        //let query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: false,
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{ tab... Remove this comment to see the full error message
          'screening.status': model.screening.status,
        };
        injectCategoryId(query);
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        let results = await db.Argument
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
          flowUtils.setVerdictModel(result);
        });
        // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{ tab... Remove this comment to see the full error message
        model.arguments = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'argumentsMore' does not exist on type '{... Remove this comment to see the full error message
            model.argumentsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      questions: async function() {
        if (!allTabs && model.tab !== 'questions') {
          return;
        }
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: false,
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{ tab... Remove this comment to see the full error message
          'screening.status': model.screening.status,
        };
        injectCategoryId(query);
        //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        let results = await db.Question
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
        });
        // @ts-ignore TS(2339): Property 'questions' does not exist on type '{ tab... Remove this comment to see the full error message
        model.questions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'questionsMore' does not exist on type '{... Remove this comment to see the full error message
            model.questionsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      answers: async function() {
        if (!allTabs && model.tab !== 'answers') {
          return;
        }
        //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{ tab... Remove this comment to see the full error message
        let query = { private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        let results = await db.Answer
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
        });
        // @ts-ignore TS(2339): Property 'answers' does not exist on type '{ tab: ... Remove this comment to see the full error message
        model.answers = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'answersMore' does not exist on type '{ t... Remove this comment to see the full error message
            model.answersMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      artifacts: async function() {
        if (!allTabs && model.tab !== 'artifacts') {
          return;
        }
        //let query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: false,
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{ tab... Remove this comment to see the full error message
          'screening.status': model.screening.status,
        };
        injectCategoryId(query);
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        let results = await db.Artifact
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT);
        //.lean()

        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
          result.setThumbnailPath(req.params.username);
        });
        // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{ tab... Remove this comment to see the full error message
        model.artifacts = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'artifactsMore' does not exist on type '{... Remove this comment to see the full error message
            model.artifactsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      issues: async function() {
        if (!allTabs && model.tab !== 'issues') {
          return;
        }
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{ tab... Remove this comment to see the full error message
        let query = { private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        let results = await db.Issue
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
        });
        // @ts-ignore TS(2339): Property 'issues' does not exist on type '{ tab: a... Remove this comment to see the full error message
        model.issues = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'issuesMore' does not exist on type '{ ta... Remove this comment to see the full error message
            model.issuesMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      opinions: async function() {
        if (!allTabs && model.tab !== 'opinions') {
          return;
        }
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{ tab... Remove this comment to see the full error message
        let query = { private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        let results = await db.Opinion
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
        });
        // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{ tab:... Remove this comment to see the full error message
        model.opinions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'opinionsMore' does not exist on type '{ ... Remove this comment to see the full error message
            model.opinionsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
    });
    flowUtils.setClipboardModel(req, model);
    res.render(templates.wiki.index, model);
  });

};
