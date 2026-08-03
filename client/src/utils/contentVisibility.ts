export type ContentVisibilityPreference = 'accepted' | 'active' | 'all';
export type ApiViewMode = 'wiki' | 'active' | 'original' | 'archived' | 'all';
export type PageViewMode = 'default' | 'wiki' | 'original' | 'archived' | 'all';

export const CONTENT_VISIBILITY_STORAGE_KEY = 'wt_content_visibility_v1';

export const CONTENT_VISIBILITY_OPTIONS: Array<{
  value: ContentVisibilityPreference;
  label: string;
  description: string;
}> = [
  { value: 'accepted', label: 'Accepted only', description: 'Show screened and accepted public content.' },
  { value: 'active', label: 'Accepted + pending', description: 'Also show contributions awaiting screening.' },
  { value: 'all', label: 'All public states', description: 'Include rejected and archived public content.' },
];

export function normalizeContentVisibilityPreference(value: unknown): ContentVisibilityPreference {
  return value === 'active' || value === 'all' ? value : 'accepted';
}

export function preferenceToApiView(preference: ContentVisibilityPreference): ApiViewMode {
  if (preference === 'active') return 'active';
  if (preference === 'all') return 'all';
  return 'wiki';
}

export function normalizePageViewMode(value: unknown): PageViewMode {
  return value === 'wiki' || value === 'original' || value === 'archived' || value === 'all'
    ? value
    : 'default';
}

export function visibilityLabel(view: ApiViewMode): string {
  if (view === 'wiki') return 'Accepted only';
  if (view === 'active') return 'Accepted + pending';
  if (view === 'original') return 'Pending only';
  if (view === 'archived') return 'Archived only';
  return 'All public states';
}

type CountBucket = {
  accepted?: number;
  pending?: number;
  rejected?: number;
  archived?: number;
  total?: number;
} | null | undefined;

export function countForView(bucket: CountBucket, view: ApiViewMode): number {
  if (!bucket) return 0;
  const accepted = Number(bucket.accepted || 0);
  const pending = Number(bucket.pending || 0);
  const rejected = Number(bucket.rejected || 0);
  const archived = Number(bucket.archived || 0);
  if (view === 'wiki') return accepted;
  if (view === 'active') return accepted + pending;
  if (view === 'original') return pending;
  if (view === 'archived') return archived;
  return accepted + pending + rejected + archived;
}

export function screeningMatchesView(status: unknown, view: ApiViewMode): boolean {
  const normalized = Number(status);
  if (view === 'all') return true;
  if (view === 'active') return normalized === 0 || normalized === 1;
  if (view === 'wiki') return normalized === 1;
  if (view === 'original') return normalized === 0;
  return normalized === 3;
}
