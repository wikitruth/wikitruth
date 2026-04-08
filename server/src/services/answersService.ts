'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery, ServiceSort } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

const flowUtils = require('../utils/flowUtils') as FlowUtilsContract;
const constants = require('../models/constants') as WikitruthConstants;
const db = require('../app').db.models as {
  Answer: LeanModel<ServiceEntry>;
};

/**
 * Get list of answers
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, sort
 * @returns {Promise<Array>} Array of answers
 */
async function getAnswersList(query: ServiceQuery, options: ServiceListOptions = {}): Promise<ServiceEntry[]> {
  const limit = options.limit ?? 50;
  const sort = (options.sort ?? { editDate: -1 }) as ServiceSort;
  
  const results = await db.Answer.find(query)
    .sort(sort)
    .limit(limit)
    .lean();
  
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
  await flowUtils.setEditorsUsername(results);
  
  results.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer);
  });
  
  return results;
}

/**
 * Get single answer entry with details
 * @param {String} answerId - Answer ID
 * @param {Object} req - Express request object (for appendEntryExtras)
 * @returns {Promise<Object>} Answer object
 */
async function getAnswerEntry(answerId: string, req: ServiceListOptions['req']): Promise<ServiceEntry | null> {
  const answer = await db.Answer.findById(answerId).lean();
  
  if (!answer) {
    return null;
  }
  
  await flowUtils.setUsername(answer);
  await flowUtils.setEntryParent(answer, constants.OBJECT_TYPES.answer);
  flowUtils.appendEntryExtras(answer, constants.OBJECT_TYPES.answer, req);
  
  return answer;
}

module.exports = {
  getAnswersList,
  getAnswerEntry,
};
