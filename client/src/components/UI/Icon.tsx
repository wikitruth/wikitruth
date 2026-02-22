import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  ariaLabel?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = '', ariaLabel }) => {
  return <i className={`fa fa-${name} ${className}`.trim()} aria-label={ariaLabel} />;
};

export default Icon;
