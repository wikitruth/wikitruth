import API_BASE_URL from './baseUrl';

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

