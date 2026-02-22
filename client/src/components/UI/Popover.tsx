import React from 'react';

interface PopoverProps {
  title?: React.ReactNode;
  content: React.ReactNode;
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({ title, content, children }) => {
  return (
    <span className="wt-popover" role="button" tabIndex={0} aria-label="Popover trigger">
      {children}
      <span className="wt-popover-content" role="tooltip">
        {title ? <strong className="wt-popover-title">{title}</strong> : null}
        <span>{content}</span>
      </span>
    </span>
  );
};

export default Popover;
