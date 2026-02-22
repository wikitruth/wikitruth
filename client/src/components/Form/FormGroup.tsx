import React from 'react';

interface FormGroupProps {
  children: React.ReactNode;
  label?: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

const FormGroup: React.FC<FormGroupProps> = ({
  children,
  label,
  htmlFor,
  required = false,
  className = '',
}) => {
  return (
    <div className={`form-group ${className}`.trim()}>
      {label ? (
        <label htmlFor={htmlFor} className="control-label">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      {children}
    </div>
  );
};

export default FormGroup;
