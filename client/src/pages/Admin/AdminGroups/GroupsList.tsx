import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminListPage from '../common/AdminListPage';

const GroupsList: React.FC = () => {
  return (
    <AdminListPage
      title="Admin Groups"
      subtitle="Manage administrative groups and permissions"
      emptyMessage="No admin groups found."
      detailPath="/admin/groups"
      loadItems={adminApi.adminGroups}
    />
  );
};

export default GroupsList;
