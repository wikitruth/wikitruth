import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const GroupDetails: React.FC = () => {
  return (
    <AdminDetailsPage
      title="Admin Group Details"
      backPath="/admin/groups"
      loadItem={adminApi.adminGroup}
      updateAction={{
        onUpdate: adminApi.updateAdminGroup,
        fields: [{ path: 'name', label: 'Name', required: true }],
      }}
      deleteAction={{
        confirmMessage: 'Delete this admin group? This action cannot be undone.',
        onDelete: adminApi.deleteAdminGroup,
      }}
    />
  );
};

export default GroupDetails;
