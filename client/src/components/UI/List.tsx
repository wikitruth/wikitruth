import React from 'react';

interface ListProps {
  children: React.ReactNode;
  className?: string;
}

const List: React.FC<ListProps> = ({ children, className = '' }) => {
  return <ul className={`list-group ${className}`.trim()}>{children}</ul>;
};

export default List;
