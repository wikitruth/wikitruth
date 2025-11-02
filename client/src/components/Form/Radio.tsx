import React from 'react';

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: RadioOption[];
  disabled?: boolean;
  className?: string;
  error?: string;
  label?: string;
  inline?: boolean;
}

const Radio: React.FC<RadioProps> = ({
  name,
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  error,
  label,
  inline = false,
}) => {
  const radioClassName = inline ? 'radio-inline' : 'radio';

  return (
    <div className="form-group">
      {label && (
        <label className="control-label">{label}</label>
      )}
      <div className={className}>
        {options.map((option) => (
          <div key={option.value} className={radioClassName}>
            <label>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={onChange}
                disabled={disabled || option.disabled}
              />
              {' '}
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && <span className="help-block text-danger">{error}</span>}
    </div>
  );
};

export default Radio;
