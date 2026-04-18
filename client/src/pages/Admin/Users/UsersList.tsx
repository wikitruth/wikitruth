import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminListPage from '../common/AdminListPage';

const UsersList: React.FC = () => {
  return (
    <AdminListPage
      title="Users"
      subtitle="Manage platform users"
      emptyMessage="No users found."
      detailPath="/admin/users"
      loadItems={adminApi.users}
      createAction={{
        buttonLabel: 'Create user',
        fields: [
          { key: 'username', label: 'Username', required: true },
          { key: 'email', label: 'Email', required: true, placeholder: 'user@example.com' },
          { key: 'password', label: 'Password', required: true },
        ],
        onCreate: adminApi.createUser,
      }}
      bulkDeleteAction={{
        buttonLabel: 'Delete selected users',
        confirmMessage: 'Delete selected user records? This action cannot be undone.',
        onDelete: adminApi.deleteUser,
      }}
    />
  );
};

export default UsersList;
