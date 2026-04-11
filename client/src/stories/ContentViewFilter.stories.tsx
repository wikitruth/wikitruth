import React, { useState } from 'react';
import ContentViewFilter, { ViewMode } from '../components/common/ContentViewFilter';

const meta = {
  title: 'Filters/ContentViewFilter',
  component: ContentViewFilter,
  args: {
    value: 'all' as ViewMode,
  },
};

export default meta;

export const Default = {
  args: { value: 'all' as ViewMode },
};

export const WikiSelected = {
  args: { value: 'wiki' as ViewMode },
};

export const OriginalSelected = {
  args: { value: 'original' as ViewMode },
};

export const Interactive = {
  render: () => {
    const [mode, setMode] = useState<ViewMode>('all');
    return <ContentViewFilter value={mode} onChange={setMode} />;
  },
};
