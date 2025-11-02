import React from 'react';

interface CheckboxProps {
  id?: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  name,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  error,
}) => {
  const checkboxId = id || name;

  return (
    <div className={`checkbox ${className}`.trim()}>
      <label>
        <input
          id={checkboxId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        {' '}
        {label}
      </label>
      {error && <span className="help-block text-danger" style={{ display: 'block' }}>{error}</span>}
    </div>
  );
};

export default Checkbox;
