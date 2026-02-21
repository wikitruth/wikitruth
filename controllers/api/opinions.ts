// @ts-nocheck
'use strict';

const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const opinionsService = require('../../services/opinionsService');

module.exports = function (router) {
  // Get opinions list
  router.get('/', async function (req, res) {
    try {
      await GET_opinions(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get opinion entry
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_opinion_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/opinions/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_opinions(req, res) {
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
  
  const results = await opinionsService.getOpinionsList(query, { limit: 50 });
  
  model.opinions = results;
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}

async function GET_opinion_entry(req, res) {
  const opinion = await opinionsService.getOpinionEntry(req.params.id, req);
  
  if (!opinion) {
    return res.status(404).json({ error: 'Opinion not found' });
  }
  
  res.json({ opinion });
}
