import React from 'react';
import { Link } from 'react-router';

interface BreadcrumbItem {
  title: string;
  url?: string;
  active?: boolean;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <ol className="breadcrumb wt-bc">
      {items.map((item, index) => (
        <li key={index} className={item.active ? 'active' : ''}>
          {item.url && !item.active ? (
            <Link to={item.url}>
              {item.icon ? <i className={`fa fa-${item.icon} text-muted`} aria-hidden="true"></i> : null}
              {item.icon ? ' ' : ''}
              {item.title}
            </Link>
          ) : (
            <span>
              {item.icon ? <i className={`fa fa-${item.icon} text-muted`} aria-hidden="true"></i> : null}
              {item.icon ? ' ' : ''}
              {item.title}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
};

export default Breadcrumb;
