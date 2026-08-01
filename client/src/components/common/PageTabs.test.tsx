import React from 'react';
import { render, screen } from '../../test-utils/render';
import PageTabs from './PageTabs';

describe('PageTabs', () => {
  it('renders a single entry section as a heading instead of an empty navigation strip', () => {
    render(
      <PageTabs
        tabs={[{ id: 'details', title: 'Details', icon: 'info-circle', url: '/topics/entry/cuba/cuba' }]}
        activeTab="details"
        variant="entry"
        singleItemMode="heading"
      />,
      { route: '/topics/entry/cuba/cuba' },
    );

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Details' })).not.toBeInTheDocument();
    expect(document.querySelector('.nav.nav-tabs')).not.toBeInTheDocument();
  });

  it('keeps multiple entry destinations as compact navigation', () => {
    render(
      <PageTabs
        tabs={[
          { id: 'details', title: 'Details', icon: 'info-circle', url: '/topics/entry/cuba/cuba' },
          { id: 'topics', title: 'Topics', icon: 'folder-open', url: '/topics/cuba/cuba', count: 1 },
        ]}
        activeTab="details"
        variant="entry"
        singleItemMode="heading"
      />,
      { route: '/topics/entry/cuba/cuba' },
    );

    expect(screen.getByRole('navigation', { name: 'Entry sections' }).querySelector('ul')).toHaveClass('wt-entry-tabs');
    expect(screen.getByRole('link', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Topics 1' })).toBeInTheDocument();
  });
});
