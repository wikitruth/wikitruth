import React from 'react';
import EmptyState from '../components/common/EmptyState';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  args: {
    title: 'No items found',
    description: 'Try adjusting your search or filter to find what you are looking for.',
  },
};

export default meta;

export const Default = {};

export const WithIcon = {
  args: {
    icon: 'search',
    title: 'No search results',
    description: 'Try a different search term.',
  },
};

export const WithAction = {
  args: {
    icon: 'plus-circle',
    title: 'No topics yet',
    description: 'Create your first topic to get started.',
    action: <button className="btn btn-primary">Create Topic</button>,
  },
};

export const MinimalTitle = {
  args: {
    title: 'Nothing here',
    description: undefined,
  },
};
