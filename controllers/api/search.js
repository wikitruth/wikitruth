'use strict';

const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const db = require('../../app').db.models;

module.exports = function (router) {
  router.get('/', async function (req, res) {
    try {
      await GET_search(req, res);
    } catch (error) {
      console.error('Error in GET /api/search:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_search(req, res) {
  const query = req.query.q;
  
  if (!query) {
    return res.json({ 
      topics: [], 
      arguments: [], 
      questions: [] 
    });
  }

  let model = {};
  flowUtils.setScreeningModel(req, model);

  // Search topics
  const topicResults = await db.Topic.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ],
    private: false,
    'screening.status': model.screening.status,
  })
  .sort({ editDate: -1 })
  .limit(20)
  .lean();

  await flowUtils.setEditorsUsername(topicResults);
  await flowUtils.setEntryParents(topicResults, constants.OBJECT_TYPES.topic);
  topicResults.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
  });

  // Search arguments
  const argumentResults = await db.Argument.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ],
    private: false,
    'screening.status': model.screening.status,
  })
  .sort({ editDate: -1 })
  .limit(20)
  .lean();

  await flowUtils.setEditorsUsername(argumentResults);
  await flowUtils.setEntryParents(argumentResults, constants.OBJECT_TYPES.argument);
  argumentResults.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
    flowUtils.setVerdictModel(result);
  });

  // Search questions
  const questionResults = await db.Question.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ],
    private: false,
    'screening.status': model.screening.status,
  })
  .sort({ editDate: -1 })
  .limit(20)
  .lean();

  await flowUtils.setEditorsUsername(questionResults);
  await flowUtils.setEntryParents(questionResults, constants.OBJECT_TYPES.question);
  questionResults.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });

  res.json({
    topics: topicResults,
    arguments: argumentResults,
    questions: questionResults,
  });
}
