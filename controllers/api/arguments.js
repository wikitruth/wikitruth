'use strict';

const async = require('async');
const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const argumentsService = require('../../services/argumentsService');
const db = require('../../app').db.models;

module.exports = function (router) {
  // Get arguments list
  router.get('/', async function (req, res) {
    try {
      await GET_arguments(req, res);
    } catch (error) {
      console.error('Error in GET /api/arguments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get argument entry
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_argument_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/arguments/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_arguments(req, res) {
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
  
  const argumentsList = await argumentsService.getArgumentsList(query, {
    limit: 50,
    req: req,
  });
  
  model.arguments = argumentsList;
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}

async function GET_argument_entry(req, res) {
  const argument = await argumentsService.getArgumentEntry(req.params.id, req);
  
  if (!argument) {
    return res.status(404).json({ error: 'Argument not found' });
  }
  
  res.json({ argument });
}
