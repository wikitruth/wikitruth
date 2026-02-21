// @ts-nocheck
'use strict';

let templates = require('../models/templates'),
  constants = require('../models/constants'),
  flowUtils = require('../utils/flowUtils'),
  db = require('../app').db.models,
  async = require('async');

module.exports = function(router) {

  router.get('/', async function(req, res) {
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
        let query = { parentId: { $ne: null }, private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        let results = await db.Topic
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT);

        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
        });
        model.topics = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.topicsMore = true;
          }
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
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
          flowUtils.setVerdictModel(result);
        });
        model.arguments = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.argumentsMore = true;
          }
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
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
        });
        model.questions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.questionsMore = true;
          }
          model.results = true;
        }
      },
      answers: async function() {
        if (!allTabs && model.tab !== 'answers') {
          return;
        }
        //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        let query = { private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        let results = await db.Answer
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
        });
        model.answers = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.answersMore = true;
          }
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
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
          result.setThumbnailPath(req.params.username);
        });
        model.artifacts = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.artifactsMore = true;
          }
          model.results = true;
        }
      },
      issues: async function() {
        if (!allTabs && model.tab !== 'issues') {
          return;
        }
        let query = { private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        let results = await db.Issue
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
        });
        model.issues = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.issuesMore = true;
          }
          model.results = true;
        }
      },
      opinions: async function() {
        if (!allTabs && model.tab !== 'opinions') {
          return;
        }
        let query = { private: false, 'screening.status': model.screening.status };
        injectCategoryId(query);
        let results = await db.Opinion
          .find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();

        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
        });
        model.opinions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.opinionsMore = true;
          }
          model.results = true;
        }
      },
    });
    flowUtils.setClipboardModel(req, model);
    res.render(templates.wiki.index, model);
  });

};
