import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminListPage from '../common/AdminListPage';

const AccountsList: React.FC = () => {
  return (
    <AdminListPage
      title="Accounts"
      subtitle="Manage account records"
      emptyMessage="No accounts found."
      detailPath="/admin/accounts"
      loadItems={adminApi.accounts}
      bulkDeleteAction={{
        buttonLabel: 'Delete selected accounts',
        confirmMessage: 'Delete selected accounts? This action cannot be undone.',
        onDelete: adminApi.deleteAccount,
      }}
    />
  );
};

export default AccountsList;
