import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const UserDetails: React.FC = () => {
  return (
    <AdminDetailsPage
      title="User Details"
      backPath="/admin/users"
      loadItem={adminApi.user}
      updateAction={{
        onUpdate: adminApi.updateUser,
        fields: [
          { path: 'username', label: 'Username', required: true },
          { path: 'email', label: 'Email', type: 'email' },
          { path: 'isActive', label: 'Status' },
          { path: 'roles.admin', label: 'Admin Role ID' },
          { path: 'roles.account', label: 'Account Role ID' },
          { path: 'roles.screener', label: 'Can Screen', type: 'checkbox' },
          { path: 'roles.reviewer', label: 'Can Review', type: 'checkbox' },
        ],
      }}
      deleteAction={{
        confirmMessage: 'Delete this user? This action cannot be undone.',
        onDelete: adminApi.deleteUser,
      }}
    />
  );
};

export default UserDetails;
