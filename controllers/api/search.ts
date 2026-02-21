'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_search(req, res);
    } catch (error) {
      console.error('Error in GET /api/search:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    'screening.status': model.screening.status,
  })
  .sort({ editDate: -1 })
  .limit(20)
  .lean();

  await flowUtils.setEditorsUsername(topicResults);
  await flowUtils.setEntryParents(topicResults, constants.OBJECT_TYPES.topic);
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
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
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    'screening.status': model.screening.status,
  })
  .sort({ editDate: -1 })
  .limit(20)
  .lean();

  await flowUtils.setEditorsUsername(argumentResults);
  await flowUtils.setEntryParents(argumentResults, constants.OBJECT_TYPES.argument);
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
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
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    'screening.status': model.screening.status,
  })
  .sort({ editDate: -1 })
  .limit(20)
  .lean();

  await flowUtils.setEditorsUsername(questionResults);
  await flowUtils.setEntryParents(questionResults, constants.OBJECT_TYPES.question);
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  questionResults.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });

  res.json({
    topics: topicResults,
    arguments: argumentResults,
    questions: questionResults,
  });
}
