import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminRecord } from '../../../services/api/admin';

interface AdminCreateField {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

interface AdminCreateAction {
  buttonLabel: string;
  fields: AdminCreateField[];
  onCreate: (payload: Record<string, string>) => Promise<AdminRecord | null>;
}

interface AdminBulkDeleteAction {
  buttonLabel?: string;
  confirmMessage?: string;
  onDelete: (id: string) => Promise<unknown>;
}

interface AdminListPageProps {
  title: string;
  subtitle: string;
  emptyMessage: string;
  detailPath: string;
  loadItems: () => Promise<AdminRecord[]>;
  createAction?: AdminCreateAction;
  bulkDeleteAction?: AdminBulkDeleteAction;
}

function getDisplayName(item: AdminRecord): string {
  return (
    String(item.name || item.title || item.username || item.email || '').trim() ||
    String(item._id || item.id || 'Unnamed item')
  );
}

const AdminListPage: React.FC<AdminListPageProps> = ({
  title,
  subtitle,
  emptyMessage,
  detailPath,
  loadItems,
  createAction,
  bulkDeleteAction,
}) => {
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createValues, setCreateValues] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const reload = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await loadItems();
      setItems(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : `Failed to load ${title.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadItems, title]);

  useEffect(() => {
    setSelectedIds((previous) =>
      previous.filter((id) => items.some((item) => String(item._id || item.id || '') === id))
    );
  }, [items]);

  const handleCreateChange = (key: string, value: string) => {
    setCreateValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createAction) {
      return;
    }

    for (const field of createAction.fields) {
      const value = (createValues[field.key] || '').trim();
      if (field.required && !value) {
        setCreateError(`${field.label} is required.`);
        return;
      }
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      setCreateSuccess(null);
      const created = await createAction.onCreate(createValues);
      if (created) {
        setItems((previous) => [created, ...previous]);
      }
      setCreateValues({});
      setCreateSuccess('Created successfully.');
    } catch (mutationError) {
      setCreateError(
        mutationError instanceof Error ? mutationError.message : `Failed to create ${title.toLowerCase()} entry`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }
    const id = String(item._id || item.id || '').toLowerCase();
    const displayName = getDisplayName(item).toLowerCase();
    const haystack = `${displayName} ${id}`;
    return haystack.includes(normalizedQuery);
  });

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(String(item._id || item.id || '')));

  const toggleRowSelection = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((current) => current !== id)
        : [...previous, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredItems
      .map((item) => String(item._id || item.id || ''))
      .filter(Boolean);
    if (visibleIds.length === 0) {
      return;
    }

    if (allVisibleSelected) {
      setSelectedIds((previous) => previous.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((previous) => Array.from(new Set([...previous, ...visibleIds])));
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteAction || selectedIds.length === 0) {
      return;
    }

    const confirmMessage =
      bulkDeleteAction.confirmMessage ||
      `Delete ${selectedIds.length} selected record(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    const failedIds: string[] = [];
    for (const id of selectedIds) {
      try {
        await bulkDeleteAction.onDelete(id);
      } catch (_deleteError) {
        failedIds.push(id);
      }
    }

    const successfulDeleteCount = selectedIds.length - failedIds.length;
    if (successfulDeleteCount > 0) {
      setItems((previous) =>
        previous.filter((item) => !selectedIds.includes(String(item._id || item.id || '')))
      );
      setDeleteSuccess(`Deleted ${successfulDeleteCount} record(s).`);
    }

    if (failedIds.length > 0) {
      setDeleteError(`Failed to delete ${failedIds.length} record(s). Review selection and retry.`);
    }

    setSelectedIds(failedIds);
    setIsDeleting(false);
  };

  return (
    <div className="container">
      <h3>{title}</h3>
      <p className="text-muted">{subtitle}</p>

      {createAction ? (
        <form className="panel panel-default" onSubmit={handleCreateSubmit}>
          <div className="panel-heading">
            <strong>{createAction.buttonLabel}</strong>
          </div>
          <div className="panel-body">
            <div className="row">
              {createAction.fields.map((field) => (
                <div className="col-sm-4 form-group" key={field.key}>
                  <label htmlFor={`${title}-${field.key}`}>{field.label}</label>
                  <input
                    id={`${title}-${field.key}`}
                    className="form-control"
                    value={createValues[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={(event) => handleCreateChange(field.key, event.target.value)}
                  />
                </div>
              ))}
            </div>
            {createError ? <div className="alert alert-danger">{createError}</div> : null}
            {createSuccess ? <div className="alert alert-success">{createSuccess}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      ) : null}

      {isLoading ? <p className="text-muted">Loading...</p> : null}
      {error ? (
        <div className="alert alert-danger">
          {error}{' '}
          <button type="button" className="btn btn-link btn-xs" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="panel panel-default">
          <div className="panel-body">
            <div className="row">
              <div className="col-sm-6 form-group">
                <label htmlFor={`${title}-query`}>Filter</label>
                <input
                  id={`${title}-query`}
                  className="form-control"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or id"
                />
              </div>
              <div className="col-sm-6 form-group">
                <label>&nbsp;</label>
                <div>
                  <button type="button" className="btn btn-default" onClick={() => void reload()} disabled={isLoading || isDeleting}>
                    Refresh
                  </button>{' '}
                  {bulkDeleteAction ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={isDeleting || selectedIds.length === 0}
                      onClick={() => void handleBulkDelete()}
                    >
                      {isDeleting
                        ? 'Deleting...'
                        : `${bulkDeleteAction.buttonLabel || 'Delete selected'} (${selectedIds.length})`}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            {deleteError ? <div className="alert alert-warning">{deleteError}</div> : null}
            {deleteSuccess ? <div className="alert alert-success">{deleteSuccess}</div> : null}
          </div>
        </div>
      ) : null}

      {!isLoading && !error ? (
        filteredItems.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  {bulkDeleteAction ? (
                    <th style={{ width: 42 }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label={`Select all ${title.toLowerCase()}`}
                      />
                    </th>
                  ) : null}
                  <th>Name</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const id = String(item._id || item.id || '');
                  return (
                    <tr key={id || getDisplayName(item)}>
                      {bulkDeleteAction ? (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            onChange={() => toggleRowSelection(id)}
                            aria-label={`Select ${getDisplayName(item)}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        {id ? <Link to={`${detailPath}/${id}`}>{getDisplayName(item)}</Link> : getDisplayName(item)}
                      </td>
                      <td>
                        <code>{id || '-'}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">{emptyMessage}</p>
        )
      ) : null}
    </div>
  );
};

export default AdminListPage;
