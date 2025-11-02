import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Tab {
  id: string;
  title: string;
  url: string;
  icon?: string;
  count?: number;
}

interface PageTabsProps {
  tabs: Tab[];
  activeTab?: string;
}

const PageTabs: React.FC<PageTabsProps> = ({ tabs, activeTab }) => {
  const location = useLocation();
  
  const isActive = (tab: Tab) => {
    if (activeTab) {
      return tab.id === activeTab;
    }
    return location.pathname === tab.url;
  };

  return (
    <ul className="nav nav-tabs wt-tabs">
      {tabs.map((tab) => (
        <li key={tab.id} className={isActive(tab) ? 'active' : ''}>
          <Link to={tab.url}>
            {tab.icon && <i className={`fa fa-${tab.icon}`} aria-hidden="true"></i>}{' '}
            {tab.title}
            {tab.count !== undefined && (
              <span className="wt-label label label-default">{tab.count}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default PageTabs;
