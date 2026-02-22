import React from 'react';

interface RowProps {
  children: React.ReactNode;
  className?: string;
}

const Row: React.FC<RowProps> = ({ children, className = '' }) => {
  return <div className={`row ${className}`.trim()}>{children}</div>;
};

export default Row;
