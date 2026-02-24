import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const AdminDetails: React.FC = () => {
  return (
    <AdminDetailsPage
      title="Administrator Details"
      backPath="/admin/administrators"
      loadItem={adminApi.administrator}
    />
  );
};

export default AdminDetails;
