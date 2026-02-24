import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const GroupDetails: React.FC = () => {
  return <AdminDetailsPage title="Admin Group Details" backPath="/admin/groups" loadItem={adminApi.adminGroup} />;
};

export default GroupDetails;
