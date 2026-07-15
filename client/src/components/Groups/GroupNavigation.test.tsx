import React from 'react';
import { render, screen } from '../../test-utils/render';
import type { LegacyEntity } from '../../types/legacy';
import GroupNavigation from './GroupNavigation';

describe('GroupNavigation', () => {
  it('keeps About, Posts, and Members available with a stable canonical base path', () => {
    const group = {
      _id: 'group-1',
      friendlyUrl: 'research-team',
      title: 'Research Team',
    } as LegacyEntity;

    render(<GroupNavigation group={group} activeTab="posts" />);

    expect(screen.getByRole('tab', { name: /about/i })).toHaveAttribute(
      'href',
      '/groups/research-team/group-1'
    );
    expect(screen.getByRole('tab', { name: /posts/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('tab', { name: /members/i })).toHaveAttribute(
      'href',
      '/groups/research-team/group-1/members'
    );
  });
});
