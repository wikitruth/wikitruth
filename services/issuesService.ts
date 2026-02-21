// @ts-nocheck
'use strict';

const flowUtils = require('../utils/flowUtils');
const constants = require('../models/constants');
const db = require('../app').db.models;

/**
 * Get list of issues
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, sort
 * @returns {Promise<Array>} Array of issues
 */
async function getIssuesList(query, options = {}) {
  const limit = options.limit || 50;
  const sort = options.sort || { editDate: -1 };
  
  const results = await db.Issue.find(query)
    .sort(sort)
    .limit(limit)
    .lean();
  
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
  await flowUtils.setEditorsUsername(results);
  
  results.forEach(function (result) {
    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue);
  });
  
  return results;
}

/**
 * Get single issue entry with details
 * @param {String} issueId - Issue ID
 * @param {Object} req - Express request object (for appendEntryExtras)
 * @returns {Promise<Object>} Issue object
 */
async function getIssueEntry(issueId, req) {
  const issue = await db.Issue.findById(issueId).lean();
  
  if (!issue) {
    return null;
  }
  
  await flowUtils.setUsername(issue);
  await flowUtils.setEntryParent(issue, constants.OBJECT_TYPES.issue);
  flowUtils.appendEntryExtras(issue, constants.OBJECT_TYPES.issue, req);
  issue.issueType = constants.ISSUE_TYPES['type' + issue.issueType];
  
  return issue;
}

module.exports = {
  getIssuesList,
  getIssueEntry,
};
