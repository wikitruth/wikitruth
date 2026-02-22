import React from 'react';

interface ArtifactRowProps {
  title: string;
  description?: string;
}

const ArtifactRow: React.FC<ArtifactRowProps> = ({ title, description }) => {
  return (
    <li className="list-group-item">
      <strong>{title}</strong>
      {description ? <p className="text-muted">{description}</p> : null}
    </li>
  );
};

export default ArtifactRow;
