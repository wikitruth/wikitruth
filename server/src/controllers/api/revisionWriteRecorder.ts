'use strict';

import type { WikitruthRequest } from '../../types/http';
import { captureEntryRevision } from '../../services/entryRevisionService';

type RevisionSource = 'create' | 'update' | 'merge' | 'change_request' | 'rollback';

export async function recordEntryRevision(options: {
  req: WikitruthRequest;
  objectType: number;
  entry: Record<string, unknown>;
  source: RevisionSource;
  summary: string;
}): Promise<void> {
  const objectId = String(options.entry._id || '').trim();
  if (!objectId) {
    throw new Error('Cannot record a revision without an entry ID');
  }
  await captureEntryRevision({
    objectType: options.objectType,
    objectId,
    entry: options.entry,
    source: options.source,
    summary: options.summary,
    actorId: String(options.req.user?.id || options.req.user?._id || '') || null,
    actorUsername: String(options.req.user?.username || ''),
    apiClientId: options.req.apiClient?.id || null,
    apiClientName: options.req.apiClient?.name || '',
    agentRunId: options.req.agentRun?.runId || '',
    agentModel: options.req.agentRun?.model || '',
    agentProvider: options.req.agentRun?.provider || '',
    agentPurpose: options.req.agentRun?.purpose || '',
    sourceManifest: options.req.agentRun?.sourceManifest || [],
  });
}
