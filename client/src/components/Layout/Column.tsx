import React from 'react';

interface ColumnProps {
  children: React.ReactNode;
  className?: string;
}

const Column: React.FC<ColumnProps> = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};

export default Column;
