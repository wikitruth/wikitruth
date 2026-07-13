import type { CivicRecordKind, CivicTenant } from '../../types/civic';

export interface CivicSection {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  kinds: CivicRecordKind[];
  createKinds: CivicRecordKind[];
}

const EYEBROWS: Record<string, string> = {
  organizations: 'Who is responsible', people: 'Public responsibility', projects: 'Follow the work and money',
  incidents: 'Report, verify, resolve', actions: 'What happens next', elections: 'Evidence for decisions', history: 'Public memory',
};

export function civicSectionsForTenant(tenant: CivicTenant): CivicSection[] {
  return tenant.sections.filter((section) => section.enabled).map((section) => ({
    ...section,
    eyebrow: EYEBROWS[section.slug] || 'Public accountability',
  }));
}

export function getCivicSection(tenant: CivicTenant, slug?: string): CivicSection | undefined {
  return civicSectionsForTenant(tenant).find((section) => section.slug === slug);
}
