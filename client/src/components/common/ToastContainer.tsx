import React from 'react';
import { useNotification, type ToastType } from '../../context/NotificationContext';

const iconMap: Record<ToastType, string> = {
  success: 'check-circle',
  danger: 'times-circle',
  warning: 'exclamation-triangle',
  info: 'info-circle',
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '380px',
        width: '100%',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`alert alert-${toast.type} alert-dismissible`}
          role="alert"
          style={{
            marginBottom: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
            animation: 'fadeIn 0.3s ease-in',
          }}
        >
          <button
            type="button"
            className="close"
            onClick={() => removeToast(toast.id)}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <i className={`fa fa-${iconMap[toast.type]}`}></i> {toast.message}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
