'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const artifactsService = require('../../services/artifactsService');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // GET /api/artifacts - List artifacts
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      const model = {};
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
      
      const results = await artifactsService.getArtifactsList(query, { limit: 50 });
      // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
      model.artifacts = results;
      
      // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
      delete model.screening;
      res.json(model);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/artifacts/entry/:id - Get single artifact
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      const artifact = await artifactsService.getArtifactEntry(req.params.id, req);
      
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }
      
      res.json({ artifact });
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });
};
