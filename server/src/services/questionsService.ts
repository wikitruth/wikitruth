'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

import * as flowUtilsNs from '../utils/flowUtils';
const flowUtils = flowUtilsNs as unknown as FlowUtilsContract;
const constants = require('../models/constants') as WikitruthConstants;
const db = require('../app').db.models as {
  Question: LeanModel<ServiceEntry>;
};

/**
 * Get a list of questions based on query and options
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, req
 * @returns {Promise<Array>} Array of questions with enriched data
 */
async function getQuestionsList(query: ServiceQuery, options: ServiceListOptions = {}): Promise<ServiceEntry[]> {
  const limit = options.limit ?? 50;
  const req = options.req;
  
  const results = await db.Question.find(query)
    .sort({ editDate: -1 })
    .limit(limit)
    .lean();
  
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
  await flowUtils.setEditorsUsername(results);
  
  results.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });
  
  return results;
}

/**
 * Get a single question entry by ID
 * @param {String} questionId - Question ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Question object with enriched data
 */
async function getQuestionEntry(questionId: string, req: ServiceListOptions['req']): Promise<ServiceEntry | null> {
  const question = await db.Question.findById(questionId).lean();
  
  if (!question) {
    return null;
  }
  
  await flowUtils.setUsername(question);
  await flowUtils.setEntryParent(question, constants.OBJECT_TYPES.question);
  flowUtils.appendEntryExtras(question, constants.OBJECT_TYPES.question, req);
  
  return question;
}

export {
  getQuestionsList,
  getQuestionEntry,
};
