import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const StatusDetails: React.FC = () => {
  return <AdminDetailsPage title="Status Details" backPath="/admin/statuses" loadItem={adminApi.status} />;
};

export default StatusDetails;
