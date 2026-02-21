'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
const async = require('async');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get topics list
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_topics(req, res);
    } catch (error) {
      console.error('Error in GET /api/topics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get topic entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_topic_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/topics/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_topics(req, res) {
  let model = {};
  flowUtils.setScreeningModel(req, model);
  
  if (!req.query.topic && req.params.id) {
    req.query.topic = req.params.id;
  }
  
  await async.parallel({
    topic: async function () {
      await flowUtils.setTopicModels(req, model);
    },
    topics: async function () {
      // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
      model.topics = await flowUtils.getTopics(
        {
          parentId: req.query.topic,
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
          'screening.status': model.screening.status,
        },
        {
          limit: 0,
          req: req,
        }
      );
    },
  });
  
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (model.topic) {
    // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
    flowUtils.setScreeningModelCount(model, model.topic.childrenCount.topics);
  }
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_topic_entry(req, res) {
  const model = {};
  req.query.topic = req.params.id;
  
  await flowUtils.setTopicModels(req, model);
  
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (!model.topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }
  
  if (!req.query.topic) {
    // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
    req.query.topic = model.topic._id;
  }
  
  await async.parallel({
    categories: async function () {
      // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
      if (model.topic.parentId) {
        // @ts-ignore TS(2339): Property 'categories' does not exist on type '{}'.
        model.categories = await flowUtils.getCategories(
          {
            // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
            parentId: model.topic.parentId,
            // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
            'screening.status': model.screening.status,
          },
          {
            limit: 0,
            req: req,
          }
        );
      }
    },
    topics: async function () {
      // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
      model.topics = await flowUtils.getTopics(
        {
          // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
          parentId: model.topic._id,
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
          'screening.status': model.screening.status,
        },
        {
          limit: 5,
          req: req,
        }
      );
    },
    arguments: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
        ownerId: model.topic._id,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      let results = await db.Argument.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
        flowUtils.setVerdictModel(result);
      });
      // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
      model.arguments = results;
    },
    questions: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
        ownerId: model.topic._id,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      let results = await db.Question.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
      model.questions = results;
    },
  });
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}
