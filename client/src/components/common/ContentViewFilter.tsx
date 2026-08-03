import React from 'react';
import type { PageViewMode } from '../../utils/contentVisibility';

type ViewMode = PageViewMode;

interface ContentViewFilterProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  defaultLabel?: string;
}

const options: { value: Exclude<ViewMode, 'default'>; label: string; icon: string }[] = [
  { value: 'wiki', label: 'Accepted', icon: 'check-circle' },
  { value: 'original', label: 'Pending', icon: 'clock-o' },
  { value: 'archived', label: 'Archived', icon: 'archive' },
  { value: 'all', label: 'All states', icon: 'list' },
];

const ContentViewFilter: React.FC<ContentViewFilterProps> = ({ value, onChange, defaultLabel = 'Accepted only' }) => {
  return (
    <div className="wt-content-view-control">
      <div className="wt-content-view-summary text-muted">
        {value === 'default' ? (
          <span><i className="fa fa-eye" aria-hidden="true"></i> Using your default: <strong>{defaultLabel}</strong></span>
        ) : (
          <button type="button" className="btn btn-link btn-xs" onClick={() => onChange('default')}>
            <i className="fa fa-undo" aria-hidden="true"></i> Use my default ({defaultLabel})
          </button>
        )}
      </div>
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
    </div>
  );
};

export type { ViewMode };
export default ContentViewFilter;
