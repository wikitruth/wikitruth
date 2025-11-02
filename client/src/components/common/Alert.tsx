import React from 'react';

type AlertType = 'success' | 'info' | 'warning' | 'danger';

interface AlertProps {
  type?: AlertType;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert: React.FC<AlertProps> = ({ 
  type = 'info', 
  children, 
  dismissible = false,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`alert alert-${type}${dismissible ? ' alert-dismissible' : ''}`} role="alert">
      {dismissible && (
        <button 
          type="button" 
          className="close" 
          onClick={handleDismiss}
          aria-label="Close"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
      {children}
    </div>
  );
};

export default Alert;
