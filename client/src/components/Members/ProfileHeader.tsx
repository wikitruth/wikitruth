import React from 'react';

interface ProfileHeaderProps {
  username: string;
  subtitle?: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ username, subtitle }) => {
  return (
    <header className="page-header">
      <h2>{username}</h2>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
    </header>
  );
};

export default ProfileHeader;
