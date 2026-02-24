import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminListPage from '../common/AdminListPage';

const StatusesList: React.FC = () => {
  return (
    <AdminListPage
      title="Statuses"
      subtitle="Manage status entries"
      emptyMessage="No statuses found."
      detailPath="/admin/statuses"
      loadItems={adminApi.statuses}
    />
  );
};

export default StatusesList;
