import React from 'react';

interface IndexHeaderProps {
  title: string;
  count?: number;
}

const IndexHeader: React.FC<IndexHeaderProps> = ({ title, count }) => {
  return (
    <div className="page-header">
      <h2>
        {title}
        {count !== undefined ? <small className="text-muted"> ({count})</small> : null}
      </h2>
    </div>
  );
};

export default IndexHeader;
