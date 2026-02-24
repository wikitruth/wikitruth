import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const StatusDetails: React.FC = () => {
  return (
    <AdminDetailsPage
      title="Status Details"
      backPath="/admin/statuses"
      loadItem={adminApi.status}
      updateAction={{
        onUpdate: adminApi.updateStatus,
        fields: [
          { path: 'pivot', label: 'Pivot', required: true },
          { path: 'name', label: 'Name', required: true },
        ],
      }}
      deleteAction={{
        confirmMessage: 'Delete this status? This action cannot be undone.',
        onDelete: adminApi.deleteStatus,
      }}
    />
  );
};

export default StatusDetails;
