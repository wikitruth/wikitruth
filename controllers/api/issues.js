'use strict';

const flowUtils = require('../../utils/flowUtils');
const constants = require('../../models/constants');
const issuesService = require('../../services/issuesService');

module.exports = function (router) {
  // Get issues list
  router.get('/', async function (req, res) {
    try {
      await GET_issues(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get issue entry
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_issue_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_issues(req, res) {
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
  
  const results = await issuesService.getIssuesList(query, { limit: 50 });
  
  model.issues = results;
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}

async function GET_issue_entry(req, res) {
  const issue = await issuesService.getIssueEntry(req.params.id, req);
  
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }
  
  res.json({ issue });
}
