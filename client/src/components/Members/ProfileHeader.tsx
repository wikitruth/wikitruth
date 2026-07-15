import React from 'react';
import DeterministicAvatar from '../common/DeterministicAvatar';

interface ProfileHeaderProps {
  username: string;
  subtitle?: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ username, subtitle }) => {
  return (
    <header className="page-header wt-header wt-profile-header">
      <h1>
        <DeterministicAvatar seed={username} label={username} size={40} /> {username}
      </h1>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
    </header>
  );
};

export default ProfileHeader;
