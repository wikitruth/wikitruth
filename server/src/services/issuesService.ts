'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery, ServiceSort } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

import * as flowUtilsNs from '../utils/flowUtils';
import constantsMod from '../models/constants';
const flowUtils = flowUtilsNs as unknown as FlowUtilsContract;
const constants = constantsMod as unknown as WikitruthConstants;
const db = require('../app').db.models as {
  Issue: LeanModel<ServiceEntry>;
};

/**
 * Get list of issues
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, sort
 * @returns {Promise<Array>} Array of issues
 */
async function getIssuesList(query: ServiceQuery, options: ServiceListOptions = {}): Promise<ServiceEntry[]> {
  const limit = options.limit ?? 50;
  const sort = (options.sort ?? { editDate: -1 }) as ServiceSort;
  
  const results = await db.Issue.find(query)
    .sort(sort)
    .limit(limit)
    .lean();
  
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
  await flowUtils.setEditorsUsername(results);
  
  results.forEach(function (result) {
    const issueTypeCode = String(result.issueType ?? '');
    result.issueType = constants.ISSUE_TYPES['type' + issueTypeCode];
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
async function getIssueEntry(issueId: string, req: ServiceListOptions['req']): Promise<ServiceEntry | null> {
  const issue = await db.Issue.findById(issueId).lean();
  
  if (!issue) {
    return null;
  }
  
  await flowUtils.setUsername(issue);
  await flowUtils.setEntryParent(issue, constants.OBJECT_TYPES.issue);
  flowUtils.appendEntryExtras(issue, constants.OBJECT_TYPES.issue, req);
  issue.issueType = constants.ISSUE_TYPES['type' + String(issue.issueType ?? '')];
  
  return issue;
}

export {
  getIssuesList,
  getIssueEntry,
};
