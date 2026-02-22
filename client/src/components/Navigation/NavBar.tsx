import React from 'react';

interface NavBarProps {
  children: React.ReactNode;
  className?: string;
}

const NavBar: React.FC<NavBarProps> = ({ children, className = '' }) => {
  return <ul className={`nav navbar-nav ${className}`.trim()}>{children}</ul>;
};

export default NavBar;
