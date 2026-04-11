import React from 'react';
import PageHeader from '../components/common/PageHeader';

const meta = {
  title: 'Layout/PageHeader',
  component: PageHeader,
  args: {
    title: 'Topics',
    icon: 'list',
  },
};

export default meta;

export const Default = {};

export const WithSubtitle = {
  args: {
    title: 'Science',
    subtitle: 'Explore scientific topics and debates',
    icon: 'flask',
  },
};

export const WithActions = {
  args: {
    title: 'My Topics',
    icon: 'bookmark',
    actions: <button className="btn btn-primary btn-sm">Create New</button>,
  },
};

export const CustomIconColor = {
  args: {
    title: 'Warnings',
    icon: 'exclamation-triangle',
    iconColor: 'text-warning',
  },
};
