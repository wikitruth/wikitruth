'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

import * as flowUtilsNs from '../utils/flowUtils';
import constantsMod from '../models/constants';
import appModForDb from '../app';
const flowUtils = flowUtilsNs as unknown as FlowUtilsContract;
const constants = constantsMod as unknown as WikitruthConstants;
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
import { getCoreModels } from '../models/schema/typedModels';

/**
 * Get a list of topics based on query and options
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, req
 * @returns {Promise<Array>} Array of topics with enriched data
 */
async function getTopicsList(query: ServiceQuery, options: ServiceListOptions = {}): Promise<ServiceEntry[]> {
  const models = getCoreModels({ db: { models: db } } as unknown as Parameters<typeof getCoreModels>[0]) as {
    Topic: LeanModel<ServiceEntry>;
  };
  const limit = options.limit ?? 50;
  const req = options.req;
  
  const results = await models.Topic.find(query)
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
async function getTopicEntry(topicId: string, req: ServiceListOptions['req']): Promise<ServiceEntry | null> {
  const models = getCoreModels({ db: { models: db } } as unknown as Parameters<typeof getCoreModels>[0]) as {
    Topic: LeanModel<ServiceEntry>;
  };
  const topic = await models.Topic.findById(topicId).lean();
  
  if (!topic) {
    return null;
  }
  
  await flowUtils.setUsername(topic);
  await flowUtils.setEntryParent(topic, constants.OBJECT_TYPES.topic);
  flowUtils.appendEntryExtras(topic, constants.OBJECT_TYPES.topic, req);
  
  return topic;
}

export {
  getTopicsList,
  getTopicEntry,
};
