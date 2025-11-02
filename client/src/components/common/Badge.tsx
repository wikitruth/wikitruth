import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'info' | 'warning' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const badgeClass = `label label-${variant} ${className}`.trim();

  return <span className={badgeClass}>{children}</span>;
};

export default Badge;
