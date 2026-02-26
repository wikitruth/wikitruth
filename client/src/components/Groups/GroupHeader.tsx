import React from 'react';

interface GroupHeaderProps {
  title: string;
  description?: string;
}

const GroupHeader: React.FC<GroupHeaderProps> = ({ title, description }) => {
  return (
    <header className="page-header wt-header">
      <h1>
        <i className="fa fa-group"></i> {title}
      </h1>
      {description ? <p className="text-muted">{description}</p> : null}
    </header>
  );
};

export default GroupHeader;
