'use strict';

const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const answersService = require('../../services/answersService');

module.exports = function (router) {
  // GET /api/answers - List answers
  router.get('/', async function (req, res) {
    try {
      const model = {};
      flowUtils.setScreeningModel(req, model);
      
      const query = {
        ownerType: constants.OBJECT_TYPES.question,
        private: false,
        'screening.status': model.screening.status,
      };
      
      if (req.query.question) {
        query.ownerId = req.query.question;
      }
      
      const results = await answersService.getAnswersList(query, { limit: 50 });
      model.answers = results;
      
      delete model.screening;
      res.json(model);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/answers/entry/:id - Get single answer
  router.get('/entry/:id', async function (req, res) {
    try {
      const answer = await answersService.getAnswerEntry(req.params.id, req);
      
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }
      
      res.json({ answer });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
