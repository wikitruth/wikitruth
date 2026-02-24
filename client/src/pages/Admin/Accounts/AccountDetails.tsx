import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const AccountDetails: React.FC = () => {
  return <AdminDetailsPage title="Account Details" backPath="/admin/accounts" loadItem={adminApi.account} />;
};

export default AccountDetails;
