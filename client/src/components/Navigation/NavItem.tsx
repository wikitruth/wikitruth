import React from 'react';
import { Link } from 'react-router-dom';

interface NavItemProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, children, className = '' }) => {
  return (
    <li className={className}>
      <Link to={to}>{children}</Link>
    </li>
  );
};

export default NavItem;
