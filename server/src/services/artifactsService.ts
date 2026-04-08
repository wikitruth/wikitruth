'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery, ServiceSort } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

const flowUtils = require('../utils/flowUtils') as FlowUtilsContract;
const constants = require('../models/constants') as WikitruthConstants;
const db = require('../app').db.models as {
  Artifact: LeanModel<ServiceEntry>;
};

/**
 * Get list of artifacts
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options like limit, sort
 * @returns {Promise<Array>} Array of artifacts
 */
async function getArtifactsList(query: ServiceQuery, options: ServiceListOptions = {}): Promise<ServiceEntry[]> {
  const limit = options.limit ?? 50;
  const sort = (options.sort ?? { editDate: -1 }) as ServiceSort;
  
  const results = await db.Artifact.find(query)
    .sort(sort)
    .limit(limit)
    .lean();
  
  await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
  await flowUtils.setEditorsUsername(results);
  
  results.forEach(function (result) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact);
  });
  
  return results;
}

/**
 * Get single artifact entry with details
 * @param {String} artifactId - Artifact ID
 * @param {Object} req - Express request object (for appendEntryExtras)
 * @returns {Promise<Object>} Artifact object
 */
async function getArtifactEntry(artifactId: string, req: ServiceListOptions['req']): Promise<ServiceEntry | null> {
  const artifact = await db.Artifact.findById(artifactId).lean();
  
  if (!artifact) {
    return null;
  }
  
  await flowUtils.setUsername(artifact);
  await flowUtils.setEntryParent(artifact, constants.OBJECT_TYPES.artifact);
  flowUtils.appendEntryExtras(artifact, constants.OBJECT_TYPES.artifact, req);
  
  return artifact;
}

module.exports = {
  getArtifactsList,
  getArtifactEntry,
};
