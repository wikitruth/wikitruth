'use strict';

import type { NextFunction } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import constants from '../models/constants';
import { createChangeRequest } from '../services/entryRevisionService';

const ENTRY_CONFIG: Record<string, { model: string; objectType: number }> = {
  topics: { model: 'Topic', objectType: constants.OBJECT_TYPES.topic },
  arguments: { model: 'Argument', objectType: constants.OBJECT_TYPES.argument },
  questions: { model: 'Question', objectType: constants.OBJECT_TYPES.question },
  answers: { model: 'Answer', objectType: constants.OBJECT_TYPES.answer },
  artifacts: { model: 'Artifact', objectType: constants.OBJECT_TYPES.artifact },
  issues: { model: 'Issue', objectType: constants.OBJECT_TYPES.issue },
  opinions: { model: 'Opinion', objectType: constants.OBJECT_TYPES.opinion },
};

function normalizedRevisionId(value: unknown): string {
  return String(value || '').trim().replace(/^W\//, '').replace(/^"|"$/g, '');
}

function proposedChanges(body: Record<string, unknown>): Record<string, unknown> {
  const changes = { ...body };
  if (typeof changes.description !== 'undefined' && typeof changes.content === 'undefined') {
    changes.content = changes.description;
  }
  if (typeof changes.sources !== 'undefined' && typeof changes.references === 'undefined') {
    changes.references = changes.sources;
  }
  [
    'description', 'sources', 'baseRevision', 'baseRevisionId', 'changeSummary',
    'agentMetadata', 'idempotencyKey',
  ].forEach((field) => delete changes[field]);
  return changes;
}

function queryResult(query: any): Promise<Record<string, unknown> | null> {
  return typeof query?.lean === 'function' ? query.lean() : Promise.resolve(query);
}

export async function routeAgentAcceptedEditProposal(
  req: WikitruthRequest,
  res: WikitruthResponse,
  next: NextFunction,
): Promise<void> {
  if (!req.apiClient || req.method.toUpperCase() !== 'PUT') {
    next();
    return;
  }
  const match = /^\/(topics|arguments|questions|answers|artifacts|issues|opinions)\/entry\/([^/]+)\/?$/i.exec(req.path);
  const config = match?.[1] ? ENTRY_CONFIG[match[1].toLowerCase()] : null;
  const objectId = match?.[2] || '';
  if (!config || !objectId) {
    next();
    return;
  }
  const db = (req.app as unknown as { db?: { models?: Record<string, any> } }).db?.models || {};
  const entry = await queryResult(db[config.model]?.findById(objectId));
  if (!entry) {
    res.status(404).json({ success: false, message: 'Entry not found' });
    return;
  }
  const screeningStatus = Number((entry.screening as { status?: unknown } | undefined)?.status);
  if (screeningStatus === constants.SCREENING_STATUS.status0.code) {
    next();
    return;
  }
  if (screeningStatus !== constants.SCREENING_STATUS.status1.code) {
    res.status(409).json({ success: false, message: 'Only pending drafts or accepted entries can receive agent edits' });
    return;
  }

  const expectedBaseRevisionId = normalizedRevisionId(
    req.get('if-match') || req.body?.baseRevisionId || req.body?.baseRevision,
  );
  if (!expectedBaseRevisionId) {
    res.status(428).json({ success: false, message: 'Accepted-entry edits require If-Match or baseRevisionId' });
    return;
  }
  const body = (req.body || {}) as Record<string, unknown>;
  const summary = String(body.changeSummary || req.agentRun?.purpose || `Agent proposed update to ${match?.[1] || 'entry'}`).trim();
  try {
    const request = await createChangeRequest({
      objectType: config.objectType,
      objectId,
      proposedChanges: proposedChanges(body),
      summary,
      expectedBaseRevisionId,
      actorId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      apiClientId: req.apiClient.id,
      apiClientName: req.apiClient.name,
      agentRunId: req.agentRun?.runId || '',
      agentModel: req.agentRun?.model || '',
      agentProvider: req.agentRun?.provider || '',
      agentPurpose: req.agentRun?.purpose || '',
      sourceManifest: req.agentRun?.sourceManifest || [],
    });
    res.status(202).json({ success: true, proposed: true, directMutation: false, request });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create change request';
    res.status(/stale/i.test(message) ? 409 : 400).json({ success: false, message });
  }
}
