'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const answersService = require('../../services/answersService');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // GET /api/answers - List answers
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      const model = {};
      flowUtils.setScreeningModel(req, model);
      
      const query = {
        ownerType: constants.OBJECT_TYPES.question,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      
      if (req.query.question) {
        // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ owner... Remove this comment to see the full error message
        query.ownerId = req.query.question;
      }
      
      const results = await answersService.getAnswersList(query, { limit: 50 });
      // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
      model.answers = results;
      
      // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
      delete model.screening;
      res.json(model);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/answers/entry/:id - Get single answer
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      const answer = await answersService.getAnswerEntry(req.params.id, req);
      
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }
      
      res.json({ answer });
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });
};
