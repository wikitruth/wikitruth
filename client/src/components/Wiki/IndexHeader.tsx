import React from 'react';

interface IndexHeaderProps {
  title: string;
  count?: number;
}

const IndexHeader: React.FC<IndexHeaderProps> = ({ title, count }) => {
  return (
    <div className="page-header wt-header">
      <h1>
        {title}
        {count !== undefined ? <small className="text-muted"> ({count})</small> : null}
      </h1>
    </div>
  );
};

export default IndexHeader;
