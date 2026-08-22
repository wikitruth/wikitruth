'use strict';

import type { WikitruthRequest } from '../types/http';

export interface AgentAttributionFields {
  authorshipType: 'human' | 'agent';
  apiClientId: string | null;
  apiClientName: string;
  agentRunId: string;
  agentModel: string;
  agentProvider: string;
  agentPurpose: string;
  agentSourceManifest: Array<Record<string, string>>;
}

export function agentAttributionFromRequest(req: WikitruthRequest): AgentAttributionFields {
  if (!req.apiClient) {
    return {
      authorshipType: 'human', apiClientId: null, apiClientName: '', agentRunId: '',
      agentModel: '', agentProvider: '', agentPurpose: '', agentSourceManifest: [],
    };
  }
  return {
    authorshipType: 'agent',
    apiClientId: req.apiClient.id,
    apiClientName: req.apiClient.name,
    agentRunId: String(req.agentRun?.runId || ''),
    agentModel: String(req.agentRun?.model || ''),
    agentProvider: String(req.agentRun?.provider || ''),
    agentPurpose: String(req.agentRun?.purpose || ''),
    agentSourceManifest: Array.isArray(req.agentRun?.sourceManifest) ? req.agentRun!.sourceManifest : [],
  };
}

export function publicAgentAttribution(record: Record<string, any>): Record<string, unknown> | null {
  if (record.authorshipType !== 'agent' && !record.apiClientName) return null;
  const sources = (Array.isArray(record.agentSourceManifest) ? record.agentSourceManifest : [])
    .map((source: Record<string, unknown>) => ({
      url: String(source.url || ''), artifactId: String(source.artifactId || ''), checksum: String(source.checksum || ''),
    }))
    .filter((source: Record<string, string>) => source.url || source.artifactId || source.checksum);
  return {
    clientName: String(record.apiClientName || 'Software agent'),
    runId: String(record.agentRunId || ''),
    model: String(record.agentModel || ''),
    provider: String(record.agentProvider || ''),
    purpose: String(record.agentPurpose || ''),
    sources,
  };
}
