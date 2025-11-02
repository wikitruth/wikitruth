import React from 'react';

interface TextAreaProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  className?: string;
  maxLength?: number;
  error?: string;
  label?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  rows = 4,
  className = '',
  maxLength,
  error,
  label,
}) => {
  const textareaId = id || name;
  const textareaClassName = `form-control ${error ? 'error' : ''} ${className}`.trim();

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={textareaId} className="control-label">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className={textareaClassName}
        maxLength={maxLength}
      />
      {error && <span className="help-block text-danger">{error}</span>}
    </div>
  );
};

export default TextArea;
