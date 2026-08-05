import { createApiClient } from './client';

const request = createApiClient();

export interface PublicTrustMetric {
  key: string;
  label: string;
  display: string;
  description: string;
  percent?: number;
  value?: number;
  numerator?: number;
  denominator?: number;
  suppressed: boolean;
  suppressionReason?: 'small_cohort' | 'no_data';
}

export interface PublicTrustDashboard {
  generatedAt: string;
  scope: {
    label: string;
    publicRecordsOnly: true;
    windowDays: number;
    minimumCohort: number;
    includesCivicRecords: true;
  };
  summary: { publicKnowledge: number; accepted: number; pending: number; archived: number };
  quality: PublicTrustMetric[];
  lifecycle: Array<{
    key: 'accepted' | 'pending' | 'archived';
    label: string;
    value: number;
    description: string;
  }>;
  governance: PublicTrustMetric[];
  privacy: { title: string; summary: string; exclusions: string[] };
  methodology: string[];
}

export async function getPublicTrustDashboard(): Promise<PublicTrustDashboard> {
  const body = await request<{
    success: boolean;
    dashboard?: PublicTrustDashboard;
    message?: string;
  }>('/transparency/trust');
  if (!body.success || !body.dashboard) {
    throw new Error(body.message || 'Unable to load public transparency data');
  }
  return body.dashboard;
}
