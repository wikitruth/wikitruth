import React from 'react';

interface EntryFooterProps {
  children: React.ReactNode;
}

const EntryFooter: React.FC<EntryFooterProps> = ({ children }) => {
  return <footer className="wt-entry-footer">{children}</footer>;
};

export default EntryFooter;
