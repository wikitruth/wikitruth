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
    const MAX_RESULT = 15;
    const keyword = req.query.q;
    const allTabs = !req.query.tab;
    const searchContent = (req.query.content ? req.query.content : 'all').toLowerCase();
    const limit = allTabs ? MAX_RESULT : 0;
    const tab = req.query.tab ? req.query.tab : 'all';
    const model = {
      tab: tab,
      keyword: keyword,
      content: searchContent,
      results: !allTabs, // this is to allow the user to switch to other tabs if the current is empty
    };
    if (!keyword) {
      return res.render(templates.search, model);
    }
    let privacyFilter = [{ private: false }];
    switch (searchContent) {
      case 'wiki':
        privacyFilter = [{ private: false }];
        break;
      case 'diary':
        // @ts-ignore TS(2322): Type '{ private: true; createUserId: any; }[] | { ... Remove this comment to see the full error message
        privacyFilter = req.user ? [{ private: true, createUserId: req.user.id }] : [{ private: false }];
        break;
      //case 'all':
      default:
        privacyFilter = req.user ? [{ private: false }, {
          private: true,
          // @ts-ignore TS(2322): Type '({ private: false; } | { private: true; crea... Remove this comment to see the full error message
          createUserId: req.user.id,
        }] : [{ private: false }];
    }
    if (req.user) {
      req.params.username = req.user.username;
    }
    flowUtils.setModelContext(req, res, model);
    await async.parallel({
      topics: async function() {
        if (!allTabs && tab !== 'topics') {
          return;
        }
        let results = await db.Topic
          .find({ $text: { $search: keyword }, $or: privacyFilter }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(limit)
          .lean()
          .exec();
        if (!results) {
          return;
        }
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          //result.link = false;
        });
        // @ts-ignore TS(2339): Property 'topics' does not exist on type '{ tab: a... Remove this comment to see the full error message
        model.topics = results;
        if (results.length > 0) {
          if (allTabs && results.length >= MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'topicsMore' does not exist on type '{ ta... Remove this comment to see the full error message
            model.topicsMore = true;
          }
          model.results = true;
        }
      },
      arguments: async function() {
        if (!allTabs && tab !== 'arguments') {
          return;
        }
        let results = await db.Argument
          .find({ $text: { $search: keyword }, $or: privacyFilter }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(limit)
          .lean();
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
          flowUtils.setVerdictModel(result);
        });
        flowUtils.sortArguments(results);
        // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{ tab... Remove this comment to see the full error message
        model.arguments = results;
        if (results.length > 0) {
          if (allTabs && results.length >= MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'argumentsMore' does not exist on type '{... Remove this comment to see the full error message
            model.argumentsMore = true;
          }
          model.results = true;
        }
      },
      questions: async function() {
        if (!allTabs && tab !== 'questions') {
          return;
        }
        let results = await db.Question
          .find({ $text: { $search: keyword }, $or: privacyFilter }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(limit)
          .lean();
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
        });
        // @ts-ignore TS(2339): Property 'questions' does not exist on type '{ tab... Remove this comment to see the full error message
        model.questions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'questionsMore' does not exist on type '{... Remove this comment to see the full error message
            model.questionsMore = true;
          }
          model.results = true;
        }
      },
      answers: async function() {
        if (!allTabs && tab !== 'answers') {
          return;
        }
        let results = await db.Answer
          .find({ $text: { $search: keyword }, $or: privacyFilter }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(limit)
          .lean();
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
        });
        // @ts-ignore TS(2339): Property 'answers' does not exist on type '{ tab: ... Remove this comment to see the full error message
        model.answers = results;
        if (results.length > 0) {
          if (allTabs && results.length >= MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'answersMore' does not exist on type '{ t... Remove this comment to see the full error message
            model.answersMore = true;
          }
          model.results = true;
        }
      },
      artifacts: async function() {
        if (!allTabs && tab !== 'artifacts') {
          return;
        }
        let results = await db.Artifact
          .find({ $text: { $search: keyword }, $or: privacyFilter }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(limit);
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
          if (allTabs && results.length >= MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'artifactsMore' does not exist on type '{... Remove this comment to see the full error message
            model.artifactsMore = true;
          }
          model.results = true;
        }
      },
      issues: async function() {
        if (!allTabs && tab !== 'issues') {
          return;
        }
        let results = await db.Issue
          .find({ $text: { $search: keyword }, $or: privacyFilter }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(limit)
          .lean();
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
        });
        // @ts-ignore TS(2339): Property 'issues' does not exist on type '{ tab: a... Remove this comment to see the full error message
        model.issues = results;
        if (results.length > 0) {
          if (allTabs && results.length >= MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'issuesMore' does not exist on type '{ ta... Remove this comment to see the full error message
            model.issuesMore = true;
          }
          model.results = true;
        }
      },
      opinions: async function() {
        if (!allTabs && tab !== 'opinions') {
          return;
        }
        let results = await db.Opinion
          .find({ $text: { $search: keyword }, $or: privacyFilter }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(limit)
          .lean();
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
        });
        // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{ tab:... Remove this comment to see the full error message
        model.opinions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'opinionsMore' does not exist on type '{ ... Remove this comment to see the full error message
            model.opinionsMore = true;
          }
          model.results = true;
        }
      },
    });
    res.render(templates.search, model);
  });

};
