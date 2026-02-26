import React from 'react';
import { Link } from 'react-router-dom';

type ProfileTab = 'overview' | 'contributions' | 'topics' | 'following' | 'pages' | 'settings';

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
  const diaryPath = isOwnProfile ? '/members/profile/diary' : `/members/${encodeURIComponent(username)}/diary`;

  return (
    <div>
      <h1 className="page-header wt-header wt-profile-header" title={username}>
        <i className="fa fa-user-circle fa-2x"></i>
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
          <li role="presentation" className={activeTab === 'topics' ? 'active' : ''}>
            <Link to={diaryPath} role="tab">
              <i className="fa fa-folder-open"></i> My Diary
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
