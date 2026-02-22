import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, footer, className = '' }) => {
  return (
    <section className={`panel panel-default ${className}`.trim()}>
      {title ? <header className="panel-heading">{title}</header> : null}
      <div className="panel-body">{children}</div>
      {footer ? <footer className="panel-footer">{footer}</footer> : null}
    </section>
  );
};

export default Card;
