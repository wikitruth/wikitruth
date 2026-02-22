import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="table-responsive">
      <table className={`table ${className}`.trim()}>{children}</table>
    </div>
  );
};

export default Table;
