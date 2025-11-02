'use strict';

const flowUtils = require('../utils/flowUtils');
const constants = require('../models/constants');
const db = require('../app').db.models;

/**
 * Get a list of arguments based on query and options
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, req
 * @returns {Promise<Array>} Array of arguments with enriched data
 */
async function getArgumentsList(query, options = {}) {
  const limit = options.limit || 50;
  const req = options.req;
  
  let results = await db.Argument.find(query)
    .sort({ editDate: -1 })
    .limit(limit)
    .lean();
  
  await flowUtils.setEditorsUsername(results);
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
  
  results.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
    flowUtils.setVerdictModel(result);
  });
  
  return results;
}

/**
 * Get a single argument entry by ID
 * @param {String} argumentId - Argument ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Argument object with enriched data
 */
async function getArgumentEntry(argumentId, req) {
  const argument = await db.Argument.findById(argumentId).lean();
  
  if (!argument) {
    return null;
  }
  
  await flowUtils.setUsername(argument);
  await flowUtils.setEntryParent(argument, constants.OBJECT_TYPES.argument);
  flowUtils.appendEntryExtras(argument, constants.OBJECT_TYPES.argument, req);
  flowUtils.setVerdictModel(argument);
  
  return argument;
}

module.exports = {
  getArgumentsList,
  getArgumentEntry,
};
