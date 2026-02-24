import React from 'react';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const CategoryDetails: React.FC = () => {
  return (
    <AdminDetailsPage
      title="Category Details"
      backPath="/admin/categories"
      loadItem={adminApi.category}
      updateAction={{
        onUpdate: adminApi.updateCategory,
        fields: [
          { path: 'title', label: 'Title', required: true },
          { path: 'id', label: 'Legacy ID' },
          { path: 'parentId', label: 'Parent Category ID' },
        ],
      }}
      deleteAction={{
        confirmMessage: 'Delete this category? This action cannot be undone.',
        onDelete: adminApi.deleteCategory,
      }}
    />
  );
};

export default CategoryDetails;
