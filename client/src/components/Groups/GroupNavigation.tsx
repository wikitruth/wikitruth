import React from 'react';
import { Link } from 'react-router';
import type { LegacyEntity } from '../../types/legacy';

type GroupNavigationProps = {
  group: LegacyEntity;
  activeTab: 'about' | 'posts' | 'members';
};

const GroupNavigation: React.FC<GroupNavigationProps> = ({ group, activeTab }) => {
  const friendly = encodeURIComponent(String(group.friendlyUrl || group._id || ''));
  const id = encodeURIComponent(String(group._id || ''));
  const basePath = `/groups/${friendly}/${id}`;
  const tabs = [
    { id: 'about' as const, label: 'About', icon: 'info-circle', path: basePath },
    { id: 'posts' as const, label: 'Posts', icon: 'list-alt', path: `${basePath}/posts` },
    { id: 'members' as const, label: 'Members', icon: 'users', path: `${basePath}/members` },
  ];

  return (
    <ul
      className="nav nav-tabs wt-tabs wt-group-tabs"
      role="tablist"
      aria-label={`${group.title} sections`}
    >
      {tabs.map(tab => (
        <li key={tab.id} role="presentation" className={activeTab === tab.id ? 'active' : ''}>
          <Link to={tab.path} role="tab" aria-current={activeTab === tab.id ? 'page' : undefined}>
            <i className={`fa fa-${tab.icon}`} aria-hidden="true"></i> {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default GroupNavigation;
