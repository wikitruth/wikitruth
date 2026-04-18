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
      createAction={{
        buttonLabel: 'Create admin group',
        fields: [
          { key: '_id', label: 'Group ID', required: true, placeholder: 'e.g. moderators' },
          { key: 'name', label: 'Name', required: true, placeholder: 'Moderators' },
        ],
        onCreate: adminApi.createAdminGroup,
      }}
      bulkDeleteAction={{
        buttonLabel: 'Delete selected groups',
        confirmMessage: 'Delete selected admin groups? This action cannot be undone.',
        onDelete: adminApi.deleteAdminGroup,
      }}
    />
  );
};

export default GroupsList;
