import React from 'react';

interface InputProps {
  id?: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'search' | 'date' | 'datetime-local';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
  label?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  autoComplete,
  maxLength,
  error,
  label,
  inputMode,
  pattern,
}) => {
  const inputId = id || name;
  const inputClassName = `form-control ${error ? 'error' : ''} ${className}`.trim();

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="control-label">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClassName}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
      />
      {error && <span className="help-block text-danger">{error}</span>}
    </div>
  );
};

export default Input;
