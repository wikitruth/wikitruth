import React from 'react';
import Alert from '../../../components/common/Alert';

const DBBackupPage: React.FC = () => {
  return (
    <div className="container">
      <h2>Database Backup</h2>
      <p className="text-muted">Operational backup controls are currently managed via legacy admin flow.</p>
      <Alert type="info">
        Use the legacy backup page for write operations:
        {' '}
        <a href="/admin/">Open legacy admin tools</a>
      </Alert>
    </div>
  );
};

export default DBBackupPage;
