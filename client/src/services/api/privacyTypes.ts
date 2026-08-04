export type PrivacyRequestType = 'export' | 'anonymization';
export type PrivacyRequestStatus = 'submitted' | 'in_review' | 'approved' | 'ready' | 'processing' | 'completed' | 'rejected' | 'cancelled' | 'blocked' | 'failed';

export type PrivacyRequest = {
  id: string; reference: string; type: PrivacyRequestType; status: PrivacyRequestStatus;
  requesterUserId: string; subjectUserId: string; reason: string;
  subject?: { _id?: string; username?: string; email?: string; isActive?: string; roles?: Record<string, unknown> } | null;
  legalHold: { active: boolean; reason: string; changedAt: string | null };
  review: { reviewedAt?: string | null; reviewedByUserId?: string; decisionNote?: string };
  approval: { approvedAt?: string | null; approvedByUserId?: string };
  preview: { generatedAt: string | null; expiresAt: string | null; counts: Record<string, number>; blockers: string[] };
  download: { readyAt: string | null; readyExpiresAt: string | null; tokenExpiresAt: string | null; downloadedAt: string | null };
  execution: { startedAt?: string | null; completedAt?: string | null; executedByUserId?: string; pseudonym?: string; failureCode?: string };
  timeline: Array<{ type: string; note: string; actorUserId: string; at: string }>;
  createDate: string | null; editDate: string | null;
};

export type AnonymizationPreview = {
  request: PrivacyRequest; previewToken: string; confirmationPhrase: string;
};
