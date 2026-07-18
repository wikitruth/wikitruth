import React from 'react';
import { render, screen } from '../../test-utils/render';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';

function entry(overrides: Partial<LegacyEntity> = {}): LegacyEntity {
  return {
    _id: 'question-1',
    id: 'question-1',
    friendlyUrl: 'sample-question',
    title: 'Sample question',
    subtitle: '',
    description: '',
    content: '',
    contentPreview: 'A useful preview of the entry.',
    source: '',
    ownerId: 'topic-1',
    ownerType: 'topic',
    questionId: '',
    topicId: 'topic-1',
    references: '',
    parentId: null,
    private: false,
    issueType: 0,
    editDate: '2026-07-14T02:03:04.000Z',
    createDate: '2026-07-13T02:03:04.000Z',
    editorUsername: 'root',
    username: 'root',
    email: '',
    createUserId: 'user-1',
    roleType: 0,
    file: { type: '', name: '' },
    ...overrides,
  };
}

describe('EntryRowDetails', () => {
  it('renders semantic status, parent context, preview, authorship, and interactions', () => {
    const item = entry({
      screening: { status: 0 },
      editUsername: 'root',
      editDateString: 'yesterday',
      comments: 3,
      points: 2,
      parentTopic: entry({
        _id: 'topic-1',
        friendlyUrl: 'science',
        title: 'Science',
        contentPreview: '',
      }),
    });

    render(
      <EntryRowDetails
        entry={item}
        kind="question"
        entryPath="/questions/entry/sample-question/question-1"
      />
    );

    expect(screen.getByText('pending')).toHaveClass('label-warning');
    expect(screen.getByRole('link', { name: 'Science' })).toHaveAttribute(
      'href',
      '/topics/entry/science/topic-1'
    );
    expect(screen.getByText('A useful preview of the entry.')).toBeInTheDocument();
    expect(screen.getByTitle("View root's profile")).toHaveAttribute('href', '/members/root');
    expect(screen.getByText('yesterday')).toHaveAttribute('title', expect.stringContaining('2026'));
    expect(screen.getByText('reply').closest('a')).toHaveAttribute(
      'href',
      '/opinions/create?parentId=question-1&parentType=question'
    );
    expect(screen.getByText('3').closest('a')).toHaveAttribute(
      'href',
      '/questions/entry/sample-question/question-1/discussion'
    );
  });

  it('renders artifact media without offering an opinion reply', () => {
    const item = entry({
      _id: 'artifact-1',
      friendlyUrl: 'evidence',
      title: 'Evidence image',
      thumbnailPath: '/media/thumb.jpg',
      filePath: '/media/original.jpg',
    });

    render(
      <EntryRowDetails
        entry={item}
        kind="artifact"
        entryPath="/artifacts/entry/evidence/artifact-1"
      />
    );

    expect(screen.getByRole('img', { name: 'Evidence image' })).toHaveAttribute(
      'src',
      '/media/thumb.jpg'
    );
    expect(screen.getByTitle('Open original file')).toHaveAttribute('href', '/media/original.jpg');
    expect(screen.queryByText('reply')).not.toBeInTheDocument();
  });

  it('uses a compact accessible icon for accepted screening status', () => {
    render(
      <EntryRowDetails
        entry={entry({ screening: { status: 1 } })}
        kind="question"
        entryPath="/questions/entry/sample-question/question-1"
      />
    );

    const accepted = screen.getByLabelText('Accepted after screening');
    expect(accepted).toHaveAttribute('title', 'Accepted after screening');
    expect(accepted.querySelector('.fa-check-circle')).toBeInTheDocument();
    expect(screen.queryByText('accepted')).not.toBeInTheDocument();
  });

  it('suppresses redundant accepted status in accepted-only lists', () => {
    render(
      <EntryRowDetails
        entry={entry({ screening: { status: 1 } })}
        kind="question"
        entryPath="/questions/entry/sample-question/question-1"
        hideAcceptedStatus={true}
      />
    );

    expect(screen.queryByLabelText('Accepted after screening')).not.toBeInTheDocument();
  });
});
