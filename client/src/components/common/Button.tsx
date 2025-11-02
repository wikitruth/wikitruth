import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'primary' | 'success' | 'info' | 'warning' | 'danger' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  type = 'button',
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  icon
}) => {
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  const btnClass = `btn btn-${variant} ${sizeClass} ${className}`.trim();

  return (
    <button 
      type={type} 
      className={btnClass} 
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <i className={`fa fa-${icon}`} aria-hidden="true"></i>}{' '}
      {children}
    </button>
  );
};

export default Button;
