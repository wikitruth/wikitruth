import createApiClient from './client';
import type {
  CivicOverview,
  CivicRecord,
  CivicRecordInput,
  CivicRecordStage,
  CivicRecordStatus,
  CivicEntryLink,
  CivicEntryRelationship,
  CivicActorContext,
  CivicJurisdiction,
  CivicMembershipUser,
  CivicTenant,
  CivicTenantMembership,
  CivicTenantRole,
} from '../../types/civic';

const request = createApiClient();

type RecordsResponse = { success?: boolean; records: CivicRecord[]; count: number };
type RecordResponse = {
  success?: boolean;
  record: CivicRecord;
  parent?: CivicRecord | null;
  children?: CivicRecord[];
  related?: CivicRecord[];
  links?: CivicEntryLink[];
};

export const civicApi = {
  tenant: () => request<{ tenant: CivicTenant }>('/civic/tenant'),
  actor: () => request<CivicActorContext>('/civic/me'),
  jurisdictions: (params: { parentId?: string; levelKey?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.parentId) search.set('parentId', params.parentId);
    if (params.levelKey) search.set('levelKey', params.levelKey);
    const suffix = search.toString();
    return request<{ jurisdictions: CivicJurisdiction[]; count: number }>(`/civic/jurisdictions${suffix ? `?${suffix}` : ''}`);
  },
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
  links: (id: string) => request<{ links: CivicEntryLink[]; count: number }>(`/civic/records/${encodeURIComponent(id)}/links`),
  addLink: (id: string, payload: { relationship: CivicEntryRelationship; objectId: string }) => request<{ link: unknown }>(`/civic/records/${encodeURIComponent(id)}/links`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  removeLink: (recordId: string, linkId: string) => request<{ success: boolean }>(`/civic/records/${encodeURIComponent(recordId)}/links/${encodeURIComponent(linkId)}`, {
    method: 'DELETE',
  }),
  platformTenants: () => request<{ tenants: CivicTenant[] }>('/civic/platform/tenants'),
  bootstrapTenants: () => request<{ success: boolean; count: number }>('/civic/platform/tenants/bootstrap', { method: 'POST' }),
  createTenant: (payload: CivicTenant) => request<{ tenant: CivicTenant }>('/civic/platform/tenants', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  updateTenant: (tenantId: string, payload: Partial<CivicTenant>) => request<{ tenant: CivicTenant }>(`/civic/platform/tenants/${encodeURIComponent(tenantId)}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }),
  provisionTenantMembership: (tenantId: string, userId: string, payload: { roles: CivicTenantRole[]; active: boolean }) => request<{ membership: CivicTenantMembership }>(`/civic/platform/tenants/${encodeURIComponent(tenantId)}/memberships/${encodeURIComponent(userId)}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }),
  adminMemberships: () => request<{ memberships: CivicTenantMembership[] }>('/civic/admin/memberships'),
  searchMembershipCandidates: (query: string) => request<{ users: CivicMembershipUser[] }>(`/civic/admin/membership-candidates?q=${encodeURIComponent(query)}`),
  updateMembership: (userId: string, payload: { roles: CivicTenantRole[]; active: boolean }) => request<{ membership: CivicTenantMembership }>(`/civic/admin/memberships/${encodeURIComponent(userId)}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }),
  createJurisdiction: (payload: { code: string; levelKey: string; name: string; parentId?: string; metadata?: Record<string, unknown> }) => request<{ jurisdiction: CivicJurisdiction }>('/civic/admin/jurisdictions', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  updateJurisdiction: (id: string, payload: { code?: string; levelKey?: string; name?: string; parentId?: string; metadata?: Record<string, unknown> }) => request<{ jurisdiction: CivicJurisdiction }>(`/civic/admin/jurisdictions/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }),
  deactivateJurisdiction: (id: string) => request<{ success: boolean; jurisdiction: CivicJurisdiction }>(`/civic/admin/jurisdictions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
};

export default civicApi;
