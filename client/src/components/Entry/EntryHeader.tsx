import React from 'react';

interface EntryHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

const EntryHeader: React.FC<EntryHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="wt-entry-header">
      <div className="clearfix">
        <h2 className="pull-left">{title}</h2>
        {actions ? <div className="pull-right">{actions}</div> : null}
      </div>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
    </header>
  );
};

export default EntryHeader;
