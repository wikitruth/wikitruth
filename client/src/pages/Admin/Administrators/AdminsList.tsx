import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminListPage from '../common/AdminListPage';

const AdminsList: React.FC = () => {
  return (
    <AdminListPage
      title="Administrators"
      subtitle="Manage administrator entries"
      emptyMessage="No administrators found."
      detailPath="/admin/administrators"
      loadItems={adminApi.administrators}
    />
  );
};

export default AdminsList;
