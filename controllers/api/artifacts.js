'use strict';

const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const artifactsService = require('../../services/artifactsService');

module.exports = function (router) {
  // GET /api/artifacts - List artifacts
  router.get('/', async function (req, res) {
    try {
      const model = {};
      flowUtils.setScreeningModel(req, model);
      
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening.status,
      };
      
      if (req.query.topic) {
        query.ownerId = req.query.topic;
      }
      
      const results = await artifactsService.getArtifactsList(query, { limit: 50 });
      model.artifacts = results;
      
      delete model.screening;
      res.json(model);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/artifacts/entry/:id - Get single artifact
  router.get('/entry/:id', async function (req, res) {
    try {
      const artifact = await artifactsService.getArtifactEntry(req.params.id, req);
      
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }
      
      res.json({ artifact });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
