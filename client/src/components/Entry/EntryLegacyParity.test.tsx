import React from 'react';
import { render, screen } from '../../test-utils/render';
import { EntryMetaBlock } from './EntryLegacyParity';
import type { LegacyEntity } from '../../types/legacy';

function entry(overrides: Partial<LegacyEntity>): LegacyEntity {
  return {
    _id: 'entry-1',
    id: 'entry-1',
    friendlyUrl: 'entry',
    title: 'Entry',
    subtitle: '',
    description: '',
    content: '',
    contentPreview: '',
    source: '',
    ownerId: '',
    ownerType: 'topic',
    questionId: '',
    topicId: '',
    references: '',
    parentId: null,
    private: false,
    issueType: 0,
    editDate: '2026-07-13T00:00:00.000Z',
    createDate: '2026-07-13T00:00:00.000Z',
    editorUsername: 'editor',
    username: 'editor',
    email: '',
    createUserId: 'user-1',
    roleType: 0,
    file: { type: '', name: '' },
    ...overrides,
  };
}

describe('EntryMetaBlock lifecycle cues', () => {
  it('labels archived records without hiding their history', () => {
    render(<EntryMetaBlock entry={entry({ screening: { status: 3 } })} />);
    expect(screen.getByText('Archived record.')).toBeInTheDocument();
    expect(screen.getByText(/historical context/i)).toBeInTheDocument();
  });

  it('shows a reference date and asks readers to verify newer evidence', () => {
    const { container } = render(<EntryMetaBlock entry={entry({ referenceDate: '2024-01-15T08:30:00.000Z' })} />);
    expect(screen.getByText('Time-sensitive information.')).toBeInTheDocument();
    expect(screen.getByText(/verify newer evidence/i)).toBeInTheDocument();
    expect(container.querySelector('time')).toHaveAttribute('title', expect.stringContaining('2024'));
  });
});
