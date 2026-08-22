import createApiClient from './client';

const request = createApiClient();

export type EntryTranslation = {
  _id: string;
  objectName: string;
  objectId: string;
  locale: string;
  title: string;
  content: string;
  contentPreview?: string;
  sourceRevisionId: string;
  sourceRevisionNumber: number;
  status: 'pending' | 'published' | 'rejected';
  stale?: boolean;
  createUsername?: string;
  reviewUsername?: string;
  reviewReason?: string;
  authorshipType?: 'human' | 'agent';
  agentAttribution?: {
    clientName: string;
    runId: string;
    model: string;
    provider: string;
    purpose: string;
    sources: Array<{ url: string; artifactId: string; checksum: string }>;
  } | null;
};

export const translationsApi = {
  list: (objectName: string, objectId: string) => request<{
    success: boolean;
    currentRevision: { id: string; number: number };
    translations: EntryTranslation[];
  }>(`/translations/${encodeURIComponent(objectName)}/${encodeURIComponent(objectId)}`),
  submit: (objectName: string, objectId: string, payload: { locale: string; title: string; content: string }) => request<{
    success: boolean; translation: EntryTranslation;
  }>(`/translations/${encodeURIComponent(objectName)}/${encodeURIComponent(objectId)}`, {
    method: 'POST', body: JSON.stringify(payload),
  }),
  review: (id: string, action: 'publish' | 'reject', reason: string) => request<{
    success: boolean; translation: EntryTranslation;
  }>(`/translations/moderation/review/${encodeURIComponent(id)}`, {
    method: 'POST', body: JSON.stringify({ action, reason }),
  }),
};

export default translationsApi;
