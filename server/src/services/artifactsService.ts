'use strict';

import type { FlowUtilsContract, LeanModel, ServiceEntry, ServiceListOptions, ServiceQuery, ServiceSort } from './serviceTypes';
import type { WikitruthConstants } from '../types/constants';

import * as flowUtilsNs from '../utils/flowUtils';
import constantsMod from '../models/constants';
import appModForDb from '../app';
const flowUtils = flowUtilsNs as unknown as FlowUtilsContract;
const constants = constantsMod as unknown as WikitruthConstants;
const db = (appModForDb as unknown as { db: { models: {
  Artifact: LeanModel<ServiceEntry>;
} } }).db.models;

function setArtifactMediaPaths(artifact?: ServiceEntry | null): void {
  if (!artifact) {
    return;
  }
  const file = (artifact.file || {}) as { name?: unknown; type?: unknown };
  const fileName = String(file.name || '').trim();
  if (!fileName) {
    return;
  }
  const id = String(artifact._id || '').trim();
  if (!id) {
    return;
  }
  const baseFolder = '/media/artifacts/';
  if (!artifact.filePath) {
    artifact.filePath = `${baseFolder}${id}_${fileName}`;
  }
  const fileType = String(file.type || '').toLowerCase();
  if (fileType.startsWith('image') && !artifact.thumbnailPath) {
    artifact.thumbnailPath = `${baseFolder}${id}_thumbnail_${fileName}`;
  }
}
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
    setArtifactMediaPaths(result);
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
  setArtifactMediaPaths(artifact);
  
  return artifact;
}

export {
  getArtifactsList,
  getArtifactEntry,
};
