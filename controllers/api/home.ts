// @ts-nocheck
'use strict';

const async = require('async');
const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const db = require('../../app').db.models;

module.exports = function (router) {
  router.get('/', async function (req, res) {
    try {
      await GET_home(req, res);
    } catch (error) {
      console.error('Error in /api/home:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_home(req, res) {
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
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Topic.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
      });
      model.topics = results;
      if (results.length === MAX_RESULT) {
        model.topicsMore = true;
      }
    },
    arguments: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Argument.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
        flowUtils.setVerdictModel(result);
      });
      model.arguments = results;
      if (results.length === MAX_RESULT) {
        model.argumentsMore = true;
      }
    },
    questions: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Question.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      model.questions = results;
      if (results.length === MAX_RESULT) {
        model.questionsMore = true;
      }
    },
    artifacts: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Artifact.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      });
      model.artifacts = results;
      if (results.length === MAX_RESULT) {
        model.artifactsMore = true;
      }
    },
    answers: async function () {
      const query = {
        private: false,
        'screening.status': model.screening.status,
      };
      let results = await db.Answer.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
      });
      model.answers = results;
      if (results.length === MAX_RESULT) {
        model.answersMore = true;
      }
    },
    issues: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Issue.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
      });
      model.issues = results;
      if (results.length === MAX_RESULT) {
        model.issuesMore = true;
      }
    },
    opinions: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening.status,
      };
      injectCategoryId(query);
      let results = await db.Opinion.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
      });
      model.opinions = results;
      if (results.length === MAX_RESULT) {
        model.opinionsMore = true;
      }
    },
  });

  // Add application data
  if (res.locals.application) {
    model.application = res.locals.application;
  }

  res.json(model);
}
