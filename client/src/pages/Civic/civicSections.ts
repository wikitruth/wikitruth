import type { CivicRecordKind } from '../../types/civic';

export interface CivicSection {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  kinds: CivicRecordKind[];
  createKinds: CivicRecordKind[];
}

export const CIVIC_SECTIONS: CivicSection[] = [
  {
    slug: 'organizations',
    title: 'Organizations & Offices',
    eyebrow: 'Who is responsible',
    description: 'Map institutions, offices, and their public responsibilities.',
    icon: 'university',
    kinds: ['institution', 'office'],
    createKinds: ['institution', 'office'],
  },
  {
    slug: 'people',
    title: 'People',
    eyebrow: 'Public responsibility',
    description: 'Connect officials and civic actors to offices, projects, incidents, and outcomes.',
    icon: 'users',
    kinds: ['person'],
    createKinds: ['person'],
  },
  {
    slug: 'projects',
    title: 'Projects',
    eyebrow: 'Follow the work and money',
    description: 'Track budgets, contracts, officials, evidence, timelines, and delivery progress.',
    icon: 'building',
    kinds: ['project'],
    createKinds: ['project'],
  },
  {
    slug: 'incidents',
    title: 'Incidents & Observations',
    eyebrow: 'Report, verify, resolve',
    description: 'Surface citizen observations and follow incidents through escalation and resolution.',
    icon: 'bolt',
    kinds: ['incident', 'observation'],
    createKinds: ['incident', 'observation'],
  },
  {
    slug: 'actions',
    title: 'Actions',
    eyebrow: 'What happens next',
    description: 'Track commitments, public responses, citizen initiatives, and measurable follow-through.',
    icon: 'hand-paper-o',
    kinds: ['action'],
    createKinds: ['action'],
  },
  {
    slug: 'elections',
    title: 'Vote Wisely',
    eyebrow: 'Evidence for decisions',
    description: 'Compare candidates using public-service history, issue links, platforms, and evidence.',
    icon: 'check-square-o',
    kinds: ['election', 'candidate'],
    createKinds: ['election', 'candidate'],
  },
  {
    slug: 'history',
    title: 'Public Memory',
    eyebrow: 'The system does not forget',
    description: 'Connect incidents and promises to later actions, evidence, and documented outcomes.',
    icon: 'history',
    kinds: ['history'],
    createKinds: ['history'],
  },
];

export function getCivicSection(slug?: string): CivicSection | undefined {
  return CIVIC_SECTIONS.find((section) => section.slug === slug);
}
