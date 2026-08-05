import React from 'react';
import { MemoryRouter } from 'react-router';
import type { StructuredDebate } from '../../services/api/structuredDebates';
import StructuredDebateWorkspace from './StructuredDebateWorkspace';
import './structuredDebate.css';

const PUBLIC_DEBATE: StructuredDebate = {
  id: 'synthetic-pilot', status: 'open', proposition: 'Public decisions should cite evidence that anyone can inspect.',
  entry: { objectName: 'topic', id: 'synthetic-entry', title: 'Evidence in public decisions', path: '/topics/entry/evidence/synthetic-entry', discussionPath: '/topics/entry/evidence/synthetic-entry/discussion' },
  format: { version: 'structured-debate-pilot-v1', consentVersion: 'structured-debate-pilot-consent-v1', participantLimit: 12, phaseWindowHours: 72, contributionLimitPerParticipantPerPhase: 1, evidenceRequired: true, alternatingStances: true, verdictImpact: 'none' },
  phases: [
    { key: 'opening', label: 'Opening positions', order: 1, status: 'completed', startedAt: '2026-08-01T00:00:00.000Z', dueAt: '2026-08-04T00:00:00.000Z', completedAt: '2026-08-03T00:00:00.000Z' },
    { key: 'response', label: 'Responses', order: 2, status: 'active', startedAt: '2026-08-03T00:00:00.000Z', dueAt: '2026-08-06T00:00:00.000Z', completedAt: null },
    { key: 'rebuttal', label: 'Rebuttals', order: 3, status: 'upcoming', startedAt: null, dueAt: null, completedAt: null },
    { key: 'closing', label: 'Closing statements', order: 4, status: 'upcoming', startedAt: null, dueAt: null, completedAt: null },
  ],
  currentPhaseKey: 'response', currentTurnStance: 'challenges',
  participants: [
    { key: 'p1', publicUsername: 'evidence-builder', stance: 'supports', status: 'active', consentedAt: '2026-08-01T01:00:00.000Z', withdrewAt: null },
    { key: 'p2', publicUsername: 'claim-tester', stance: 'challenges', status: 'active', consentedAt: '2026-08-01T01:10:00.000Z', withdrewAt: null },
  ],
  contributions: [
    { id: 'c1', participantKey: 'p1', publicUsername: 'evidence-builder', stance: 'supports', phaseKey: 'opening', contributionType: 'evidence', content: 'Inspectable sources let readers test the assumptions, dates, and methods behind a public claim.', evidenceLinks: [{ url: 'https://example.test/public-method', label: 'Public methodology' }], revisionNumber: 1, createDate: '2026-08-01T02:00:00.000Z', editDate: '2026-08-01T02:00:00.000Z' },
    { id: 'c2', participantKey: 'p2', publicUsername: 'claim-tester', stance: 'challenges', phaseKey: 'opening', contributionType: 'argument', content: 'A citation can still be selective, outdated, or disconnected from the conclusion, so inspectability alone is not sufficient.', evidenceLinks: [{ url: 'https://example.test/evidence-quality', label: 'Evidence quality checklist' }], revisionNumber: 1, createDate: '2026-08-01T03:00:00.000Z', editDate: '2026-08-01T03:00:00.000Z' },
  ],
  audit: [
    { kind: 'transition', eventType: 'pilot_created', label: 'pilot created', actor: 'pilot-facilitator', occurredAt: '2026-08-01T00:00:00.000Z' },
    { kind: 'participation', eventType: 'participant_joined', label: 'participant joined', actor: 'evidence-builder', stance: 'supports', occurredAt: '2026-08-01T01:00:00.000Z' },
    { kind: 'participation', eventType: 'participant_joined', label: 'participant joined', actor: 'claim-tester', stance: 'challenges', occurredAt: '2026-08-01T01:10:00.000Z' },
    { kind: 'transition', eventType: 'phase_advanced', label: 'phase advanced', actor: 'pilot-facilitator', fromPhase: 'opening', toPhase: 'response', occurredAt: '2026-08-03T00:00:00.000Z' },
  ],
  reviewerSummary: null, verdictStatus: null, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z', closedAt: null,
  viewer: { authenticated: false, canCreatePilot: false, canFacilitate: false, canJoin: false, participant: null, canContribute: false, contributionBlockReason: 'Sign in to join this pilot.' },
};

const noop = async () => undefined;

const meta = {
  title: 'Pilot/StructuredDebateWorkspace',
  component: StructuredDebateWorkspace,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story: React.ComponentType) => <MemoryRouter><div className="wt-debate-page"><Story /></div></MemoryRouter>],
  args: {
    debate: PUBLIC_DEBATE,
    signedIn: false,
    busy: false,
    onSignIn: () => undefined,
    onJoin: noop,
    onWithdraw: noop,
    onSubmit: noop,
    onTransition: noop,
  },
};

export default meta;

export const PublicPilot = {};

export const DarkPilot = {
  decorators: [(Story: React.ComponentType) => (
    <div data-theme="dark" style={{ minHeight: '100vh', color: 'var(--wt-text)', background: 'var(--wt-page)' }}><Story /></div>
  )],
};

export const ActiveParticipant = {
  args: {
    signedIn: true,
    debate: {
      ...PUBLIC_DEBATE,
      viewer: {
        authenticated: true, canCreatePilot: false, canFacilitate: false, canJoin: false,
        participant: { key: 'p2', publicUsername: 'claim-tester', stance: 'challenges', status: 'active' },
        canContribute: true, contributionBlockReason: null,
      },
    },
  },
};

export const Facilitator = {
  args: {
    signedIn: true,
    debate: { ...PUBLIC_DEBATE, viewer: { ...PUBLIC_DEBATE.viewer, authenticated: true, canFacilitate: true } },
  },
};
