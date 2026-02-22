import React from 'react';

interface NewOptionsPopoverProps {
  children: React.ReactNode;
}

const NewOptionsPopover: React.FC<NewOptionsPopoverProps> = ({ children }) => {
  return <div className="wt-new-options-popover">{children}</div>;
};

export default NewOptionsPopover;
