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
    />
  );
};

export default UsersList;
