'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const issuesService = require('../../services/issuesService');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get issues list
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_issues(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get issue entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_issue_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_issues(req, res) {
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
  
  const results = await issuesService.getIssuesList(query, { limit: 50 });
  
  // @ts-ignore TS(2339): Property 'issues' does not exist on type '{}'.
  model.issues = results;
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_issue_entry(req, res) {
  const issue = await issuesService.getIssueEntry(req.params.id, req);
  
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }
  
  res.json({ issue });
}
