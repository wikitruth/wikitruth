'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

import * as flowUtilsNs from '../utils/flowUtils';
import constantsMod from '../models/constants';
import appModForDb from '../app';
const flowUtils = flowUtilsNs as unknown as FlowUtilsContract;
const constants = constantsMod as unknown as WikitruthConstants;
const db = (appModForDb as unknown as { db: { models: {
  Argument: LeanModel<ServiceEntry>;
} } }).db.models;
/**
 * Get a list of arguments based on query and options
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, req
 * @returns {Promise<Array>} Array of arguments with enriched data
 */
async function getArgumentsList(query: ServiceQuery, options: ServiceListOptions = {}): Promise<ServiceEntry[]> {
  const limit = options.limit ?? 50;
  const req = options.req;
  
  const results = await db.Argument.find(query)
    .sort({ editDate: -1 })
    .limit(limit)
    .lean();
  
  await flowUtils.setEditorsUsername(results);
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
  
  results.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
    if (flowUtils.setVerdictModel) {
      flowUtils.setVerdictModel(result);
    }
  });
  
  return results;
}

/**
 * Get a single argument entry by ID
 * @param {String} argumentId - Argument ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Argument object with enriched data
 */
async function getArgumentEntry(argumentId: string, req: ServiceListOptions['req']): Promise<ServiceEntry | null> {
  const argument = await db.Argument.findById(argumentId).lean();
  
  if (!argument) {
    return null;
  }
  
  await flowUtils.setUsername(argument);
  await flowUtils.setEntryParent(argument, constants.OBJECT_TYPES.argument);
  flowUtils.appendEntryExtras(argument, constants.OBJECT_TYPES.argument, req);
  if (flowUtils.setVerdictModel) {
    flowUtils.setVerdictModel(argument);
  }
  
  return argument;
}

export {
  getArgumentsList,
  getArgumentEntry,
};
