import React from 'react';

interface GroupHeaderProps {
  title: string;
  description?: string;
}

const GroupHeader: React.FC<GroupHeaderProps> = ({ title, description }) => {
  return (
    <header className="page-header">
      <h2>{title}</h2>
      {description ? <p className="text-muted">{description}</p> : null}
    </header>
  );
};

export default GroupHeader;
