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
      createAction={{
        buttonLabel: 'Create category',
        fields: [
          { key: 'title', label: 'Title', required: true },
          { key: 'id', label: 'Legacy ID' },
          { key: 'parentId', label: 'Parent Category ID' },
        ],
        onCreate: adminApi.createCategory,
      }}
      bulkDeleteAction={{
        buttonLabel: 'Delete selected categories',
        confirmMessage: 'Delete selected categories? This action cannot be undone.',
        onDelete: adminApi.deleteCategory,
      }}
    />
  );
};

export default CategoriesList;
