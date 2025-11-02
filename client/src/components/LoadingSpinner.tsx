import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="text-center" style={{ padding: '50px 0' }}>
      <i className="fa fa-spinner fa-spin fa-3x text-primary"></i>
      <p style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>{message}</p>
    </div>
  );
};

export default LoadingSpinner;
