import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox', title, description, action }) => {
  return (
    <div className="text-center" style={{ padding: '60px 20px' }}>
      <i className={`fa fa-${icon} fa-3x text-muted`} aria-hidden="true" style={{ marginBottom: '16px' }}></i>
      <h4>{title}</h4>
      {description && <p className="text-muted">{description}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
