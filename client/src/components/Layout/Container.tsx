import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  fluid?: boolean;
  className?: string;
}

const Container: React.FC<ContainerProps> = ({ children, fluid = false, className = '' }) => {
  const containerClass = fluid ? 'container-fluid' : 'container';
  return <div className={`${containerClass} ${className}`.trim()}>{children}</div>;
};

export default Container;
