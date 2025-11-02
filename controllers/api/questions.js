'use strict';

const async = require('async');
const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const questionsService = require('../../services/questionsService');
const db = require('../../app').db.models;

module.exports = function (router) {
  // Get questions list
  router.get('/', async function (req, res) {
    try {
      await GET_questions(req, res);
    } catch (error) {
      console.error('Error in GET /api/questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get question entry
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_question_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/questions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_questions(req, res) {
  let model = {};
  flowUtils.setScreeningModel(req, model);
  
  const query = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
    'screening.status': model.screening.status,
  };
  
  if (req.query.topic) {
    query.ownerId = req.query.topic;
  }
  
  const questionsList = await questionsService.getQuestionsList(query, {
    limit: 50,
    req: req,
  });
  
  model.questions = questionsList;
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}

async function GET_question_entry(req, res) {
  const question = await questionsService.getQuestionEntry(req.params.id, req);
  
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  
  res.json({ question });
}
