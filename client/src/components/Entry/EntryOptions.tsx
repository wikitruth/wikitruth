import React from 'react';

interface EntryOption {
  id: string;
  label: string;
  onClick: () => void;
}

interface EntryOptionsProps {
  options: EntryOption[];
}

const EntryOptions: React.FC<EntryOptionsProps> = ({ options }) => {
  return (
    <ul className="dropdown-menu" role="menu">
      {options.map((option) => (
        <li key={option.id}>
          <button type="button" className="btn btn-link" onClick={option.onClick}>
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default EntryOptions;
