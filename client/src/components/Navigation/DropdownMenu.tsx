import React from 'react';

interface DropdownMenuProps {
  label: string;
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ label, children }) => {
  return (
    <li className="dropdown">
      <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
        {label} <span className="caret" />
      </a>
      <ul className="dropdown-menu">{children}</ul>
    </li>
  );
};

export default DropdownMenu;
