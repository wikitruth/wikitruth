import React from 'react';
import { render, screen } from '../../test-utils/render';
import EntryOutline from './EntryOutline';
import type { LegacyEntity } from '../../types/legacy';

function makeEntity(overrides: Partial<LegacyEntity>): LegacyEntity {
  return overrides as LegacyEntity;
}

describe('EntryOutline', () => {
  it('renders legacy key topic and key fact sections with entry links', () => {
    render(
      <EntryOutline
        keyTopics={[makeEntity({ _id: 'topic-1', friendlyUrl: 'topic-one', title: 'Topic One' })]}
        keyArguments={[makeEntity({ _id: 'argument-1', friendlyUrl: 'fact-one', title: 'Fact One' })]}
      />,
    );

    expect(screen.getByText('Key topics')).toBeInTheDocument();
    expect(screen.getByText('Key facts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Topic One' })).toHaveAttribute(
      'href',
      '/topics/entry/topic-one/topic-1',
    );
    expect(screen.getByRole('link', { name: 'Fact One' })).toHaveAttribute(
      'href',
      '/arguments/entry/fact-one/argument-1',
    );
  });
});
