import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import PageMeta from '../../../components/common/PageMeta';
import '../adminOperations.css';

type Props = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const sections = [
  { label: 'Overview', to: '/admin', paths: ['/admin'] },
  { label: 'People', to: '/admin/people', paths: ['/admin/people', '/admin/users', '/admin/accounts', '/admin/administrators', '/admin/groups'] },
  { label: 'Content & moderation', to: '/admin/knowledge-health', paths: ['/admin/knowledge-health', '/admin/verdicts', '/admin/moderation', '/admin/anonymous-contributions', '/admin/categories', '/admin/statuses'] },
  { label: 'Security', to: '/admin/api-clients', paths: ['/admin/api-clients', '/admin/audit'] },
  { label: 'Communications', to: '/admin/email-operations', paths: ['/admin/email-operations'] },
  { label: 'Tenants', to: '/admin/civic-tenants', paths: ['/admin/civic-tenants', '/admin/civic-operations'] },
  { label: 'System operations', to: '/admin/system-operations', paths: ['/admin/system-operations', '/admin/db-backup'] },
];

const AdminOperationsShell: React.FC<Props> = ({ title, description, actions, children }) => {
  const location = useLocation();
  return (
    <main className="wt-admin-page">
      <PageMeta title={title} />
      <header className="wt-admin-page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="wt-admin-page-actions">{actions}</div> : null}
      </header>
      <nav className="wt-admin-nav" aria-label="Admin operations">
        {sections.map((section) => {
          const active = section.paths.some((path) => path === '/admin'
            ? location.pathname === '/admin'
            : location.pathname.startsWith(path));
          return <Link key={section.to} to={section.to} className={active ? 'active' : ''}>{section.label}</Link>;
        })}
      </nav>
      {children}
    </main>
  );
};

export default AdminOperationsShell;
