import React from 'react';
import { render, screen } from '../../test-utils/render';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No items" description="Try adjusting your search." />);
    expect(screen.getByText('Try adjusting your search.')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { queryByText } = render(<EmptyState title="No items" />);
    expect(queryByText(/./i, { selector: 'p' })).toBeNull();
  });

  it('renders default inbox icon', () => {
    const { container } = render(<EmptyState title="No items" />);
    const icon = container.querySelector('.fa-inbox');
    expect(icon).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    const { container } = render(<EmptyState title="No items" icon="search" />);
    const icon = container.querySelector('.fa-search');
    expect(icon).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="No items" action={<button>Create</button>} />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('does not render action slot when not provided', () => {
    const { container } = render(<EmptyState title="No items" />);
    // Only heading and icon should be present, no extra wrappers for action
    const children = container.firstElementChild?.children;
    expect(children?.length).toBeLessThanOrEqual(2); // icon + h4
  });
});
