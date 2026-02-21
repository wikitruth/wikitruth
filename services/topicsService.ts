// @ts-nocheck
'use strict';

const flowUtils = require('../utils/flowUtils');
const constants = require('../models/constants');
const db = require('../app').db.models;

/**
 * Get a list of topics based on query and options
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, req
 * @returns {Promise<Array>} Array of topics with enriched data
 */
async function getTopicsList(query, options = {}) {
  const limit = options.limit || 50;
  const req = options.req;
  
  let results = await db.Topic.find(query)
    .sort({ editDate: -1 })
    .limit(limit)
    .lean();
  
  await flowUtils.setEditorsUsername(results);
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
  
  results.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
  });
  
  return results;
}

/**
 * Get a single topic entry by ID
 * @param {String} topicId - Topic ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Topic object with enriched data
 */
async function getTopicEntry(topicId, req) {
  const topic = await db.Topic.findById(topicId).lean();
  
  if (!topic) {
    return null;
  }
  
  await flowUtils.setUsername(topic);
  await flowUtils.setEntryParent(topic, constants.OBJECT_TYPES.topic);
  flowUtils.appendEntryExtras(topic, constants.OBJECT_TYPES.topic, req);
  
  return topic;
}

module.exports = {
  getTopicsList,
  getTopicEntry,
};
