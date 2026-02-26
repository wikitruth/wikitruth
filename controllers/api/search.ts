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
  const query = String(req.query.q || '').trim();
  
  if (!query) {
    return res.json({ 
      topics: [], 
      arguments: [], 
      questions: [],
      answers: [],
      artifacts: [],
      issues: [],
      opinions: [],
    });
  }

  let model = {};
  flowUtils.setScreeningModel(req, model);
  const pattern = { $regex: query, $options: 'i' };

  const baseQuery = {
    private: false,
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    'screening.status': model.screening.status,
  };

  const [topicResults, argumentResults, questionResults, answerResults, artifactResults, issueResults, opinionResults] = await Promise.all([
    db.Topic
      .find({
        ...baseQuery,
        $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }],
      })
      .sort({ editDate: -1 })
      .limit(20)
      .lean(),
    db.Argument
      .find({
        ...baseQuery,
        $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }],
      })
      .sort({ editDate: -1 })
      .limit(20)
      .lean(),
    db.Question
      .find({
        ...baseQuery,
        $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }],
      })
      .sort({ editDate: -1 })
      .limit(20)
      .lean(),
    db.Answer
      .find({
        ...baseQuery,
        $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }],
      })
      .sort({ editDate: -1 })
      .limit(20)
      .lean(),
    db.Artifact
      .find({
        ...baseQuery,
        $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }, { source: pattern }],
      })
      .sort({ editDate: -1 })
      .limit(20)
      .lean(),
    db.Issue
      .find({
        ...baseQuery,
        $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }],
      })
      .sort({ editDate: -1 })
      .limit(20)
      .lean(),
    db.Opinion
      .find({
        ...baseQuery,
        $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }],
      })
      .sort({ editDate: -1 })
      .limit(20)
      .lean(),
  ]);

  await flowUtils.setEditorsUsername(topicResults);
  await flowUtils.setEntryParents(topicResults, constants.OBJECT_TYPES.topic);
  topicResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
  });

  await flowUtils.setEditorsUsername(argumentResults);
  await flowUtils.setEntryParents(argumentResults, constants.OBJECT_TYPES.argument);
  argumentResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
    flowUtils.setVerdictModel(result);
  });

  await flowUtils.setEditorsUsername(questionResults);
  await flowUtils.setEntryParents(questionResults, constants.OBJECT_TYPES.question);
  questionResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });

  await flowUtils.setEditorsUsername(answerResults);
  await flowUtils.setEntryParents(answerResults, constants.OBJECT_TYPES.answer);
  answerResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
  });

  await flowUtils.setEditorsUsername(artifactResults);
  await flowUtils.setEntryParents(artifactResults, constants.OBJECT_TYPES.artifact);
  artifactResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
  });

  await flowUtils.setEditorsUsername(issueResults);
  await flowUtils.setEntryParents(issueResults, constants.OBJECT_TYPES.issue);
  issueResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });

  await flowUtils.setEditorsUsername(opinionResults);
  await flowUtils.setEntryParents(opinionResults, constants.OBJECT_TYPES.opinion);
  opinionResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });

  res.json({
    topics: topicResults,
    arguments: argumentResults,
    questions: questionResults,
    answers: answerResults,
    artifacts: artifactResults,
    issues: issueResults,
    opinions: opinionResults,
  });
}
