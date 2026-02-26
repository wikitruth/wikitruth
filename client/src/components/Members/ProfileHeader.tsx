import React from 'react';

interface ProfileHeaderProps {
  username: string;
  subtitle?: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ username, subtitle }) => {
  return (
    <header className="page-header wt-header wt-profile-header">
      <h1>
        <i className="fa fa-user-circle"></i> {username}
      </h1>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
    </header>
  );
};

export default ProfileHeader;
