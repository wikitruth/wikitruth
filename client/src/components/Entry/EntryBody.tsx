import React from 'react';

interface EntryBodyProps {
  children: React.ReactNode;
}

const EntryBody: React.FC<EntryBodyProps> = ({ children }) => {
  return <section className="wt-entry-body">{children}</section>;
};

export default EntryBody;
