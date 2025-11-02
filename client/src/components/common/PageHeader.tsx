import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  icon, 
  iconColor = 'text-primary',
  actions 
}) => {
  return (
    <div className="page-header wt-header">
      <div className="row">
        <div className="col-sm-8">
          <h1>
            {icon && <i className={`fa fa-${icon} ${iconColor}`} aria-hidden="true"></i>}{' '}
            {title}
          </h1>
          {subtitle && <p className="lead">{subtitle}</p>}
        </div>
        {actions && (
          <div className="col-sm-4 text-right" style={{ paddingTop: '20px' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
