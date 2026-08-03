import React from 'react';
import type { LegacyEntity } from '../../types/legacy';

type VerdictPresentation = {
  label: string;
  theme: 'success' | 'warning' | 'danger' | 'info' | 'default';
  icon: string;
};

const NUMERIC_VERDICTS: Record<number, VerdictPresentation> = {
  0: { label: 'unverified', theme: 'warning', icon: 'question-circle' },
  1: { label: 'verified', theme: 'success', icon: 'check-circle' },
  2: { label: 'false', theme: 'danger', icon: 'exclamation-circle' },
  3: { label: 'inconclusive', theme: 'warning', icon: 'question-circle' },
  10: { label: 'makes sense', theme: 'success', icon: 'check-circle' },
  11: { label: 'likely', theme: 'success', icon: 'check-circle' },
  12: { label: 'very likely', theme: 'success', icon: 'check-circle' },
  13: { label: 'most likely true', theme: 'success', icon: 'check-circle' },
  21: { label: 'unlikely', theme: 'danger', icon: 'exclamation-circle' },
  22: { label: 'very unlikely', theme: 'danger', icon: 'exclamation-circle' },
  23: { label: 'most likely false', theme: 'danger', icon: 'exclamation-circle' },
  24: { label: 'misleading (invalid)', theme: 'danger', icon: 'exclamation-circle' },
};

const TEXT_VERDICTS: Record<string, VerdictPresentation> = {
  false: NUMERIC_VERDICTS[2],
  pending: NUMERIC_VERDICTS[0],
  true: NUMERIC_VERDICTS[1],
  unverified: NUMERIC_VERDICTS[0],
  verified: NUMERIC_VERDICTS[1],
};

const THEMES = new Set<VerdictPresentation['theme']>(['success', 'warning', 'danger', 'info', 'default']);

function humanize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

export function getEntryVerdictPresentation(entry: LegacyEntity): VerdictPresentation {
  const verdict = entry.verdict || {};
  const numericStatus = Number(verdict.status);
  const normalizedResult = humanize(verdict.result);
  const fallback = Number.isInteger(numericStatus) && NUMERIC_VERDICTS[numericStatus]
    ? NUMERIC_VERDICTS[numericStatus]
    : TEXT_VERDICTS[normalizedResult] || NUMERIC_VERDICTS[0];
  const label = String(verdict.label || '').trim() || fallback.label;
  const theme = THEMES.has(verdict.theme as VerdictPresentation['theme'])
    ? verdict.theme as VerdictPresentation['theme']
    : fallback.theme;
  const icon = /^[a-z0-9-]+$/i.test(String(verdict.icon || '')) ? String(verdict.icon) : fallback.icon;

  return { label, theme, icon };
}

interface EntryVerdictStatusProps {
  entry: LegacyEntity;
}

const EntryVerdictStatus: React.FC<EntryVerdictStatusProps> = ({ entry }) => {
  const verdict = getEntryVerdictPresentation(entry);
  const accessibleLabel = `Entry verdict: ${verdict.label}`;

  return (
    <span
      className={`wt-entry-verdict-label label label-${verdict.theme}`}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <i className={`fa fa-${verdict.icon}`} aria-hidden="true"></i>{' '}
      {verdict.label}
    </span>
  );
};

export default EntryVerdictStatus;
