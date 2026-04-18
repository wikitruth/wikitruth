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
      createAction={{
        buttonLabel: 'Create status',
        fields: [
          { key: '_id', label: 'Status ID', required: true, placeholder: 'e.g. active' },
          { key: 'pivot', label: 'Pivot', required: true, placeholder: 'account' },
          { key: 'name', label: 'Name', required: true, placeholder: 'Active' },
        ],
        onCreate: adminApi.createStatus,
      }}
      bulkDeleteAction={{
        buttonLabel: 'Delete selected statuses',
        confirmMessage: 'Delete selected statuses? This action cannot be undone.',
        onDelete: adminApi.deleteStatus,
      }}
    />
  );
};

export default StatusesList;
