'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery, ServiceSort } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

import * as flowUtilsNs from '../utils/flowUtils';
import constantsMod from '../models/constants';
import appModForDb from '../app';
const flowUtils = flowUtilsNs as unknown as FlowUtilsContract;
const constants = constantsMod as unknown as WikitruthConstants;
const db = (appModForDb as unknown as { db: { models: {
  Opinion: LeanModel<ServiceEntry>;
} } }).db.models;
/**
 * Get list of opinions
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, sort
 * @returns {Promise<Array>} Array of opinions
 */
async function getOpinionsList(query: ServiceQuery, options: ServiceListOptions = {}): Promise<ServiceEntry[]> {
  const limit = options.limit ?? 50;
  const sort = (options.sort ?? { editDate: -1 }) as ServiceSort;
  
  const results = await db.Opinion.find(query)
    .sort(sort)
    .limit(limit)
    .lean();
  
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
  await flowUtils.setEditorsUsername(results);
  
  results.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion);
  });
  
  return results;
}

/**
 * Get single opinion entry with details
 * @param {String} opinionId - Opinion ID
 * @param {Object} req - Express request object (for appendEntryExtras)
 * @returns {Promise<Object>} Opinion object
 */
async function getOpinionEntry(opinionId: string, req: ServiceListOptions['req']): Promise<ServiceEntry | null> {
  const opinion = await db.Opinion.findById(opinionId).lean();
  
  if (!opinion) {
    return null;
  }
  
  await flowUtils.setUsername(opinion);
  await flowUtils.setEntryParent(opinion, constants.OBJECT_TYPES.opinion);
  flowUtils.appendEntryExtras(opinion, constants.OBJECT_TYPES.opinion, req);
  
  return opinion;
}

export {
  getOpinionsList,
  getOpinionEntry,
};
