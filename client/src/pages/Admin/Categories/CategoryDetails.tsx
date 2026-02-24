import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const CategoryDetails: React.FC = () => {
  return <AdminDetailsPage title="Category Details" backPath="/admin/categories" loadItem={adminApi.category} />;
};

export default CategoryDetails;
