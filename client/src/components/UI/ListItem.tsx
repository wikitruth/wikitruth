import React from 'react';

interface ListItemProps {
  children: React.ReactNode;
  className?: string;
}

const ListItem: React.FC<ListItemProps> = ({ children, className = '' }) => {
  return <li className={`list-group-item ${className}`.trim()}>{children}</li>;
};

export default ListItem;
