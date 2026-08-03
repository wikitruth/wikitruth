import React from 'react';
import { render, screen } from '../../test-utils/render';
import type { LegacyEntity } from '../../types/legacy';
import EntryVerdictStatus, { getEntryVerdictPresentation } from './EntryVerdictStatus';

function entity(overrides: Partial<LegacyEntity> = {}): LegacyEntity {
  return overrides as LegacyEntity;
}

describe('EntryVerdictStatus', () => {
  it('renders the enriched legacy verdict label and theme', () => {
    render(
      <EntryVerdictStatus
        entry={entity({ verdict: { status: 13, label: 'most likely true', theme: 'success', icon: 'check-circle' } })}
      />,
    );

    const label = screen.getByLabelText('Entry verdict: most likely true');
    expect(label).toHaveClass('label-success');
    expect(label).toHaveTextContent('most likely true');
  });

  it('falls back to the canonical unverified label when older records have no enriched verdict', () => {
    render(<EntryVerdictStatus entry={entity()} />);

    expect(screen.getByLabelText('Entry verdict: unverified')).toHaveClass('label-warning');
  });

  it('normalizes legacy result-only verdicts', () => {
    expect(getEntryVerdictPresentation(entity({ verdict: { result: 'true' } }))).toMatchObject({
      label: 'verified',
      theme: 'success',
    });
  });
});
