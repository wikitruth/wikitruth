import createApiClient from './client';
import type {
  CivicOverview,
  CivicRecord,
  CivicRecordInput,
  CivicRecordStage,
  CivicRecordStatus,
} from '../../types/civic';

const request = createApiClient();

type RecordsResponse = { success?: boolean; records: CivicRecord[]; count: number };
type RecordResponse = {
  success?: boolean;
  record: CivicRecord;
  parent?: CivicRecord | null;
  children?: CivicRecord[];
  related?: CivicRecord[];
};

export const civicApi = {
  overview: () => request<CivicOverview>('/civic/overview'),
  list: (params: Record<string, string | undefined> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const suffix = search.toString();
    return request<RecordsResponse>(`/civic/records${suffix ? `?${suffix}` : ''}`);
  },
  entry: (id: string) => request<RecordResponse>(`/civic/records/${encodeURIComponent(id)}`),
  create: (payload: CivicRecordInput) => request<RecordResponse>('/civic/records', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id: string, payload: Partial<CivicRecordInput>) => request<RecordResponse>(`/civic/records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  transition: (id: string, payload: {
    status?: CivicRecordStatus;
    stage?: CivicRecordStage;
    reason: string;
    outcome?: CivicRecord['outcome'];
  }) => request<RecordResponse>(`/civic/records/${encodeURIComponent(id)}/transition`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  compareCandidates: (ids: string[]) => request<{ success?: boolean; candidates: CivicRecord[] }>(
    `/civic/candidates/compare?ids=${encodeURIComponent(ids.join(','))}`,
  ),
};

export default civicApi;
