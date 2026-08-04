import React from 'react';
import { Link } from 'react-router';

interface EntryListProps {
  title: string;
  icon: string;
  iconColor?: string;
  count?: number;
  children: React.ReactNode;
  moreUrl?: string;
  moreLabel?: string;
}

const EntryList: React.FC<EntryListProps> = ({ 
  title, 
  icon, 
  iconColor = 'text-primary',
  count,
  children,
  moreUrl,
  moreLabel = 'view more'
}) => {
  return (
    <div className="wt-list" style={{ marginTop: '30px' }}>
      <ul className="list-group top-list-items">
        <li className="list-group-item highlight text-muted">
          <i className={`fa fa-${icon} ${iconColor}`} aria-hidden="true"></i>
          <div>
            {title}{' '}
            {count !== undefined && (
              <span className="wt-label label label-default">{count}</span>
            )}
          </div>
        </li>
        {children}
      </ul>
      {moreUrl && (
        <div className="top-list-items-more">
          <Link to={moreUrl} role="button" className="btn btn-default btn-sm">
            <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> {moreLabel}
            {count !== undefined && (
              <span className="wt-label label label-default">{count}</span>
            )}
          </Link>
        </div>
      )}
    </div>
  );
};

export default EntryList;
