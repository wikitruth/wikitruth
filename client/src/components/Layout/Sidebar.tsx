import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarItem {
  label: string;
  to: string;
}

interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ items, className = '' }) => {
  return (
    <aside className={`wt-sidebar ${className}`.trim()} aria-label="Sidebar navigation">
      <ul className="nav nav-pills nav-stacked">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
