import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AdminListParams, AdminListResponse, AdminRecord } from '../../../services/api/admin';

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
  loadItems: (params: AdminListParams) => Promise<AdminListResponse>;
  createAction?: AdminCreateAction;
  bulkDeleteAction?: AdminBulkDeleteAction;
}

function getDisplayName(item: AdminRecord): string {
  const objectName = (value: unknown): string => {
    if (!value || typeof value !== 'object') {
      return '';
    }
    const record = value as Record<string, unknown>;
    const direct = [record.full, record.display, record.name].find(
      candidate => typeof candidate === 'string' && candidate.trim()
    );
    if (typeof direct === 'string') {
      return direct.trim();
    }
    return [record.first, record.middle, record.last]
      .filter(candidate => typeof candidate === 'string' && candidate.trim())
      .join(' ')
      .trim();
  };

  const user =
    item.user && typeof item.user === 'object' ? (item.user as Record<string, unknown>) : null;
  const candidates = [item.name, item.title, item.username, item.email, user?.name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    const structuredName = objectName(candidate);
    if (structuredName) {
      return structuredName;
    }
  }

  return String(item._id || item.id || 'Unnamed item');
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
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createValues, setCreateValues] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await loadItems({ page, limit: 25, query });
      if (result.page > result.pages) {
        setPage(result.pages);
        return;
      }
      setItems(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : `Failed to load ${title.toLowerCase()}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadItems, page, query, title]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setSelectedIds(previous =>
      previous.filter(id => items.some(item => String(item._id || item.id || '') === id))
    );
  }, [items]);

  const handleCreateChange = (key: string, value: string) => {
    setCreateValues(previous => ({ ...previous, [key]: value }));
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
      await createAction.onCreate(createValues);
      setCreateValues({});
      setCreateSuccess('Created successfully.');
      await reload();
    } catch (mutationError) {
      setCreateError(
        mutationError instanceof Error
          ? mutationError.message
          : `Failed to create ${title.toLowerCase()} entry`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const allVisibleSelected =
    items.length > 0 &&
    items.every(item => selectedIds.includes(String(item._id || item.id || '')));

  const toggleRowSelection = (id: string) => {
    setSelectedIds(previous =>
      previous.includes(id) ? previous.filter(current => current !== id) : [...previous, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = items.map(item => String(item._id || item.id || '')).filter(Boolean);
    if (visibleIds.length === 0) {
      return;
    }

    if (allVisibleSelected) {
      setSelectedIds(previous => previous.filter(id => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds(previous => Array.from(new Set([...previous, ...visibleIds])));
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
      setDeleteSuccess(`Deleted ${successfulDeleteCount} record(s).`);
      if (failedIds.length === 0 && items.length === successfulDeleteCount && page > 1) {
        setPage(current => current - 1);
      } else {
        await reload();
      }
    }

    if (failedIds.length > 0) {
      setDeleteError(`Failed to delete ${failedIds.length} record(s). Review selection and retry.`);
    }

    setSelectedIds(failedIds);
    setIsDeleting(false);
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = queryDraft.trim();
    if (page === 1 && nextQuery === query) {
      void reload();
      return;
    }
    setPage(1);
    setQuery(nextQuery);
  };

  const clearSearch = () => {
    setQueryDraft('');
    setPage(1);
    setQuery('');
  };

  return (
    <div className="container">
      <h1 className="h3">{title}</h1>
      <p className="text-muted">{subtitle}</p>

      {createAction ? (
        <form className="panel panel-default" onSubmit={handleCreateSubmit}>
          <div className="panel-heading">
            <strong>{createAction.buttonLabel}</strong>
          </div>
          <div className="panel-body">
            <div className="row">
              {createAction.fields.map(field => (
                <div className="col-sm-4 form-group" key={field.key}>
                  <label htmlFor={`${title}-${field.key}`}>{field.label}</label>
                  <input
                    id={`${title}-${field.key}`}
                    className="form-control"
                    value={createValues[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={event => handleCreateChange(field.key, event.target.value)}
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
          <form className="panel-body" onSubmit={handleSearch} role="search">
            <div className="row">
              <div className="col-sm-6 form-group">
                <label htmlFor={`${title}-query`}>Search</label>
                <input
                  id={`${title}-query`}
                  className="form-control"
                  value={queryDraft}
                  onChange={event => setQueryDraft(event.target.value)}
                  placeholder="Search by name or id"
                />
              </div>
              <div className="col-sm-6 form-group">
                <label>&nbsp;</label>
                <div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading || isDeleting}
                  >
                    Search
                  </button>{' '}
                  {query ? (
                    <button
                      type="button"
                      className="btn btn-default"
                      onClick={clearSearch}
                      disabled={isLoading || isDeleting}
                    >
                      Clear
                    </button>
                  ) : null}{' '}
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => void reload()}
                    disabled={isLoading || isDeleting}
                  >
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
            <p className="text-muted" aria-live="polite">
              {total === 1 ? '1 record' : `${total} records`} · Page {page} of {pages}
              {query ? ` · Results for “${query}”` : ''}
            </p>
            {deleteError ? <div className="alert alert-warning">{deleteError}</div> : null}
            {deleteSuccess ? <div className="alert alert-success">{deleteSuccess}</div> : null}
          </form>
        </div>
      ) : null}

      {!isLoading && !error ? (
        items.length > 0 ? (
          <>
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
                  {items.map(item => {
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
                          {id ? (
                            <Link to={`${detailPath}/${id}`}>{getDisplayName(item)}</Link>
                          ) : (
                            getDisplayName(item)
                          )}
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
            {pages > 1 ? (
              <nav aria-label={`${title} pages`} className="text-center">
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className="btn btn-default"
                    aria-label="Previous page"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-default"
                    aria-label="Next page"
                    disabled={page >= pages || isLoading}
                    onClick={() => setPage(current => Math.min(pages, current + 1))}
                  >
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
          </>
        ) : (
          <p className="text-muted">{query ? `No records match “${query}”.` : emptyMessage}</p>
        )
      ) : null}
    </div>
  );
};

export default AdminListPage;
