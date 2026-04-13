'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
const async = require('async');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
const applications = require('../../models/applications');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res, next) {
    try {
      await GET_home(req, res);
    } catch (error) {      next(error);
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_home(req, res) {
  // @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
  let injectCategoryId = function (query) {
    if (res.locals.application) {
      query.categoryId = res.locals.application.exploreTopicId;
    }
  };
  
  let MAX_RESULT = 5;
  let model = {};
  
  let result = await db.Topic.findOne({});
  if (!result) {
    return res.json({ redirect: '/install' });
  }
  
  flowUtils.setScreeningModel(req, model);
  flowUtils.setModelContext(req, res, model);
  
  await async.parallel({
    topics: async function () {
      const query = {
        parentId: { $ne: null },
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Topic.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
      });
      // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
      model.topics = results;
      if (results.length === MAX_RESULT) {
        // @ts-ignore TS(2339): Property 'topicsMore' does not exist on type '{}'.
        model.topicsMore = true;
      }
    },
    arguments: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Argument.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
        flowUtils.setVerdictModel(result);
      });
      // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
      model.arguments = results;
      if (results.length === MAX_RESULT) {
        // @ts-ignore TS(2339): Property 'argumentsMore' does not exist on type '{... Remove this comment to see the full error message
        model.argumentsMore = true;
      }
    },
    questions: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Question.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
      await flowUtils.setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
      model.questions = results;
      if (results.length === MAX_RESULT) {
        // @ts-ignore TS(2339): Property 'questionsMore' does not exist on type '{... Remove this comment to see the full error message
        model.questionsMore = true;
      }
    },
    artifacts: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Artifact.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
      await flowUtils.setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      });
      // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
      model.artifacts = results;
      if (results.length === MAX_RESULT) {
        // @ts-ignore TS(2339): Property 'artifactsMore' does not exist on type '{... Remove this comment to see the full error message
        model.artifactsMore = true;
      }
    },
    answers: async function () {
      const query = {
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      let results = await db.Answer.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
      });
      // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
      model.answers = results;
      if (results.length === MAX_RESULT) {
        // @ts-ignore TS(2339): Property 'answersMore' does not exist on type '{}'... Remove this comment to see the full error message
        model.answersMore = true;
      }
    },
    issues: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Issue.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
      await flowUtils.setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
      });
      // @ts-ignore TS(2339): Property 'issues' does not exist on type '{}'.
      model.issues = results;
      if (results.length === MAX_RESULT) {
        // @ts-ignore TS(2339): Property 'issuesMore' does not exist on type '{}'.
        model.issuesMore = true;
      }
    },
    opinions: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Opinion.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
      await flowUtils.setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
      });
      // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{}'.
      model.opinions = results;
      if (results.length === MAX_RESULT) {
        // @ts-ignore TS(2339): Property 'opinionsMore' does not exist on type '{}... Remove this comment to see the full error message
        model.opinionsMore = true;
      }
    },
  });

  // Keep parity with legacy homepage mixed "Latest Posts" columns.
  flowUtils.createEntrySet(model);

  // Add application data
  if (res.locals.application) {
    // @ts-ignore TS(2339): Property 'application' does not exist on type '{}'... Remove this comment to see the full error message
    model.application = res.locals.application;
  }

  // Expose sidebar context so modern client can mirror legacy navigation.
  // @ts-ignore TS(2339): Property 'applications' does not exist on type '{}'.
  model.applications = applications.getApplications();
  // @ts-ignore TS(2339): Property 'appCategories' does not exist on type '{}'.
  model.appCategories = res.locals.appCategories || req.app.locals?.appCategories || [];

  res.json(model);
}
