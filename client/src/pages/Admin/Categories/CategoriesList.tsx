import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminListPage from '../common/AdminListPage';

const CategoriesList: React.FC = () => {
  return (
    <AdminListPage
      title="Categories"
      subtitle="Manage account categories"
      emptyMessage="No categories found."
      detailPath="/admin/categories"
      loadItems={adminApi.categories}
    />
  );
};

export default CategoriesList;
