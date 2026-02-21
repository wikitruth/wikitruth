// @ts-nocheck
'use strict';

const async = require('async');
const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const db = require('../../app').db.models;

module.exports = function (router) {
  // Get topics list
  router.get('/', async function (req, res) {
    try {
      await GET_topics(req, res);
    } catch (error) {
      console.error('Error in GET /api/topics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get topic entry
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_topic_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/topics/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

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
      model.topics = await flowUtils.getTopics(
        {
          parentId: req.query.topic,
          'screening.status': model.screening.status,
        },
        {
          limit: 0,
          req: req,
        }
      );
    },
  });
  
  if (model.topic) {
    flowUtils.setScreeningModelCount(model, model.topic.childrenCount.topics);
  }
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}

async function GET_topic_entry(req, res) {
  const model = {};
  req.query.topic = req.params.id;
  
  await flowUtils.setTopicModels(req, model);
  
  if (!model.topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }
  
  if (!req.query.topic) {
    req.query.topic = model.topic._id;
  }
  
  await async.parallel({
    categories: async function () {
      if (model.topic.parentId) {
        model.categories = await flowUtils.getCategories(
          {
            parentId: model.topic.parentId,
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
      model.topics = await flowUtils.getTopics(
        {
          parentId: model.topic._id,
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
        ownerId: model.topic._id,
        'screening.status': model.screening.status,
      };
      let results = await db.Argument.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
        flowUtils.setVerdictModel(result);
      });
      model.arguments = results;
    },
    questions: async function () {
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: model.topic._id,
        'screening.status': model.screening.status,
      };
      let results = await db.Question.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      model.questions = results;
    },
  });
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}
