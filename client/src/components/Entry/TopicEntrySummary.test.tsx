import React from 'react';
import { render, screen } from '../../test-utils/render';
import type { LegacyEntity } from '../../types/legacy';
import TopicEntrySummary from './TopicEntrySummary';

function entity(overrides: Partial<LegacyEntity>): LegacyEntity {
  return overrides as LegacyEntity;
}

describe('TopicEntrySummary', () => {
  it('renders legacy-compatible parent, verdict, tag, and link context', () => {
    render(
      <TopicEntrySummary
        topic={entity({ _id: 'topic-1', title: 'Republic', screening: { status: 1 } })}
        parentTopic={entity({ _id: 'science-1', title: 'Science', friendlyUrl: 'science' })}
        verdict={entity({ counts: { pending: 1 } })}
        tagLabels={[
          entity({ code: 510, text: 'Category' }),
          entity({ code: 520, text: 'Main' }),
          entity({ code: 540, text: 'Territory' }),
        ]}
        linkCount={1}
        isMainTopic={true}
      />,
    );

    expect(screen.getByText(/a sub-topic under/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Science' })).toHaveAttribute(
      'href',
      '/topics/entry/science/science-1',
    );
    expect(screen.getByTitle('unverified')).toHaveTextContent('1');
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getAllByText('Main')).toHaveLength(1);
    expect(screen.getByText('Territory')).toBeInTheDocument();
    expect(screen.getByTitle('Linked contexts')).toHaveTextContent('1');
  });

  it('falls back to the main label when the API has no tag label', () => {
    render(<TopicEntrySummary topic={entity({ _id: 'topic-1' })} isMainTopic={true} />);

    expect(screen.getByText('A topic category')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });
});
