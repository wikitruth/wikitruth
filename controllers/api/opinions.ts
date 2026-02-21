'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const opinionsService = require('../../services/opinionsService');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get opinions list
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_opinions(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get opinion entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_opinion_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_opinions(req, res) {
  let model = {};
  flowUtils.setScreeningModel(req, model);
  
  const query = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    'screening.status': model.screening.status,
  };
  
  if (req.query.topic) {
    // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ owner... Remove this comment to see the full error message
    query.ownerId = req.query.topic;
  }
  
  const results = await opinionsService.getOpinionsList(query, { limit: 50 });
  
  // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{}'.
  model.opinions = results;
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_opinion_entry(req, res) {
  const opinion = await opinionsService.getOpinionEntry(req.params.id, req);
  
  if (!opinion) {
    return res.status(404).json({ error: 'Opinion not found' });
  }
  
  res.json({ opinion });
}
