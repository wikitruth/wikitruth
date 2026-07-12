import React from 'react';

type ViewMode = 'all' | 'wiki' | 'original' | 'archived';

interface ContentViewFilterProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const options: { value: ViewMode; label: string; icon: string }[] = [
  { value: 'wiki', label: 'Accepted', icon: 'check-circle' },
  { value: 'original', label: 'Pending', icon: 'clock-o' },
  { value: 'archived', label: 'Archived', icon: 'archive' },
  { value: 'all', label: 'All states', icon: 'list' },
];

const ContentViewFilter: React.FC<ContentViewFilterProps> = ({ value, onChange }) => {
  return (
    <div className="btn-group btn-group-sm wt-content-view-filter" role="group" aria-label="Content view filter">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`btn btn-default${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          <i className={`fa fa-${opt.icon}`} aria-hidden="true" />{' '}
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export type { ViewMode };
export default ContentViewFilter;
