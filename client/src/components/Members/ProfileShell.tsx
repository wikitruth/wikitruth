import React from 'react';
import { Link } from 'react-router-dom';
import DeterministicAvatar from '../common/DeterministicAvatar';

type ProfileTab = 'overview' | 'contributions' | 'topics' | 'journal' | 'following' | 'pages' | 'settings';

interface ProfileShellProps {
  username: string;
  activeTab: ProfileTab;
  isOwnProfile: boolean;
  roles?: {
    screener?: boolean;
    reviewer?: boolean;
    admin?: string | boolean;
  };
  children: React.ReactNode;
}

const ProfileShell: React.FC<ProfileShellProps> = ({ username, activeTab, isOwnProfile, roles, children }) => {
  const baseProfilePath = isOwnProfile ? '/members/profile' : `/members/${encodeURIComponent(username)}`;
  const journalPath = isOwnProfile ? '/members/profile/journal' : `/members/${encodeURIComponent(username)}/journal`;

  return (
    <div>
      <h1 className="page-header wt-header wt-profile-header" title={username}>
        <DeterministicAvatar seed={username} label={username} size={72} className="wt-profile-avatar" />
        <br />
        {username}
        <div>
          Contributor
          {roles?.screener ? ' • Screener' : ''}
          {roles?.admin ? ' • Administrator' : ''}
          {roles?.reviewer ? ' • Reviewer' : ''}
        </div>
      </h1>

      <ul className="nav nav-tabs wt-tabs" role="tablist">
        <li role="presentation" className={activeTab === 'overview' ? 'active' : ''}>
          <Link to={baseProfilePath} role="tab">
            <i className="fa fa-user-circle"></i> About
          </Link>
        </li>
        <li role="presentation" className={activeTab === 'contributions' ? 'active' : ''}>
          <Link to={`${baseProfilePath}/contributions`} role="tab">
            <i className="fa fa-folder-open"></i> Contributions
          </Link>
        </li>
        {isOwnProfile && (
          <li role="presentation" className={activeTab === 'journal' ? 'active' : ''}>
            <Link to={journalPath} role="tab">
              <i className="fa fa-folder-open"></i> My Journal
            </Link>
          </li>
        )}
        <li role="presentation" className={activeTab === 'following' ? 'active' : ''}>
          <Link to={`${baseProfilePath}/following`} role="tab">
            <i className="fa fa-rss"></i> Following
          </Link>
        </li>
        {isOwnProfile && (
          <li role="presentation" className={activeTab === 'pages' ? 'active' : ''}>
            <Link to="/members/profile/pages" role="tab">
              <i className="fa fa-book"></i> My Pages
            </Link>
          </li>
        )}
        {isOwnProfile && (
          <li role="presentation" className={activeTab === 'settings' ? 'active' : ''}>
            <Link to="/members/profile/settings" role="tab">
              <i className="fa fa-cog"></i> Settings
            </Link>
          </li>
        )}
      </ul>

      {children}
    </div>
  );
};

export default ProfileShell;
