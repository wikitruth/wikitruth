import API_BASE_URL from './baseUrl';
import { createApiClient } from './client';

const request = createApiClient();

export interface TruthSummaryChannel {
  channel: 'factual' | 'ethical';
  status: string;
  reasoning: string;
  framework: string;
  decisionMode: 'none' | 'consensus' | 'admin_override';
  administratorOverride: boolean;
  overrideReason: string;
  policyVersion: string;
  sensitivity: 'standard' | 'elevated' | 'critical';
  eligibleVotes: number;
  leadingVotes: number;
  averageConfidence: number;
  distinctAffiliations: number;
  dissent: {
    totalVotes: number;
    statuses: Array<{ status: string; count: number }>;
    rationales: string[];
    evidenceRefs: string[];
  };
  decidedAt: string | null;
  revalidateAt: string | null;
  revalidationDue: boolean;
}

export interface TruthSummary {
  entry: { id: string; objectName: string; objectType: number; title: string; revisionId: string | null };
  channels: TruthSummaryChannel[];
  evidenceMap: Array<{
    artifactId: string;
    title: string;
    friendlyUrl: string;
    artifactType: string;
    source: string;
    relationship: string;
    citation?: Record<string, unknown> | null;
    provenance?: Record<string, unknown>;
  }>;
  unresolvedIssues: Array<{
    id: string;
    title: string;
    friendlyUrl: string;
    issueType: number;
    status: string;
    editDate: string | null;
  }>;
  generatedAt: string;
}

export type KnowledgeHealthQueueKey = 'evidence_gaps' | 'critical_issues' | 'quorum_gaps'
  | 'revalidation' | 'source_failures' | 'stale_sources' | 'duplicates' | 'unanswered_questions';

export interface KnowledgeHealthItem {
  id: string;
  taskId?: string;
  title: string;
  objectName: string;
  reason: string;
  path: string;
  editDate?: string | null;
  dueAt?: string | null;
  priority?: 'normal' | 'elevated' | 'critical';
}

export interface KnowledgeHealthQueue {
  key: KnowledgeHealthQueueKey;
  label: string;
  count: number;
  items: KnowledgeHealthItem[];
}

export interface KnowledgeHealth {
  generatedAt: string;
  total: number;
  queues: KnowledgeHealthQueue[];
}

export async function getTruthSummary(
  objectName: 'topic' | 'argument' | 'answer',
  objectId: string,
): Promise<TruthSummary | null> {
  const response = await fetch(
    `${API_BASE_URL}/epistemic/${encodeURIComponent(objectName)}/${encodeURIComponent(objectId)}/truth-summary`,
    { credentials: 'include' },
  );
  if (response.status === 404) return null;
  const body = await response.json();
  if (!response.ok || !body?.success) throw new Error(body?.message || 'Unable to load verdict explanation');
  return body.summary as TruthSummary;
}

export async function getKnowledgeHealth(
  queue?: KnowledgeHealthQueueKey,
  limit = 25,
): Promise<KnowledgeHealth> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (queue) params.set('queue', queue);
  const body = await request<{ success: boolean; health?: KnowledgeHealth; message?: string }>(
    `/epistemic/health?${params.toString()}`,
  );
  if (!body.success || !body.health) throw new Error(body.message || 'Unable to load knowledge health');
  return body.health;
}

export async function completeKnowledgeReviewTask(
  taskId: string,
  status: 'completed' | 'dismissed',
): Promise<void> {
  const body = await request<{ success: boolean; message?: string }>(
    `/epistemic/review-tasks/${encodeURIComponent(taskId)}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
  if (!body.success) throw new Error(body.message || 'Unable to update review task');
}
