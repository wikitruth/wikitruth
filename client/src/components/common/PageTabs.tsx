import React from 'react';
import { Link, useLocation } from 'react-router';

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
  variant?: 'default' | 'entry';
  singleItemMode?: 'navigation' | 'heading';
}

const PageTabs: React.FC<PageTabsProps> = ({
  tabs,
  activeTab,
  variant = 'default',
  singleItemMode = 'navigation',
}) => {
  const location = useLocation();
  
  const isActive = (tab: Tab) => {
    if (activeTab) {
      return tab.id === activeTab;
    }
    return location.pathname === tab.url;
  };

  if (tabs.length === 1 && singleItemMode === 'heading') {
    const [tab] = tabs;
    return (
      <h2 className="wt-entry-section-heading">
        {tab.icon ? <i className={`fa fa-${tab.icon}`} aria-hidden="true"></i> : null}{' '}
        {tab.title}
      </h2>
    );
  }

  const className = `nav nav-tabs wt-tabs${variant === 'entry' ? ' wt-entry-tabs' : ''}`;

  const navigation = (
    <ul className={className}>
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

  return variant === 'entry' ? (
    <nav aria-label="Entry sections">{navigation}</nav>
  ) : navigation;
};

export default PageTabs;
