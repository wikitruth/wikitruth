import React from 'react';

interface EntryOptionsPopoverProps {
  children: React.ReactNode;
}

const EntryOptionsPopover: React.FC<EntryOptionsPopoverProps> = ({ children }) => {
  return <div className="wt-entry-options-popover">{children}</div>;
};

export default EntryOptionsPopover;
