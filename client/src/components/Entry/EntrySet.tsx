import React from 'react';

interface EntrySetProps {
  children: React.ReactNode;
}

const EntrySet: React.FC<EntrySetProps> = ({ children }) => {
  return <ul className="list-group wt-entry-set">{children}</ul>;
};

export default EntrySet;
