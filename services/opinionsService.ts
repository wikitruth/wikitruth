// @ts-nocheck
'use strict';

const flowUtils = require('../utils/flowUtils');
const constants = require('../models/constants');
const db = require('../app').db.models;

/**
 * Get list of opinions
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, sort
 * @returns {Promise<Array>} Array of opinions
 */
async function getOpinionsList(query, options = {}) {
  const limit = options.limit || 50;
  const sort = options.sort || { editDate: -1 };
  
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
async function getOpinionEntry(opinionId, req) {
  const opinion = await db.Opinion.findById(opinionId).lean();
  
  if (!opinion) {
    return null;
  }
  
  await flowUtils.setUsername(opinion);
  await flowUtils.setEntryParent(opinion, constants.OBJECT_TYPES.opinion);
  flowUtils.appendEntryExtras(opinion, constants.OBJECT_TYPES.opinion, req);
  
  return opinion;
}

module.exports = {
  getOpinionsList,
  getOpinionEntry,
};
