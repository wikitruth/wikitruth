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
      bulkDeleteAction={{
        buttonLabel: 'Delete selected administrators',
        confirmMessage: 'Delete selected administrators? This action cannot be undone.',
        onDelete: adminApi.deleteAdministrator,
      }}
    />
  );
};

export default AdminsList;
