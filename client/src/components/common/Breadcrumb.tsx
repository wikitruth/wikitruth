import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  title: string;
  url?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <ol className="breadcrumb">
      {items.map((item, index) => (
        <li key={index} className={item.active ? 'active' : ''}>
          {item.url && !item.active ? (
            <Link to={item.url}>{item.title}</Link>
          ) : (
            <span>{item.title}</span>
          )}
        </li>
      ))}
    </ol>
  );
};

export default Breadcrumb;
