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

interface AdminListPageProps {
  title: string;
  subtitle: string;
  emptyMessage: string;
  detailPath: string;
  loadItems: () => Promise<AdminRecord[]>;
  createAction?: AdminCreateAction;
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
}) => {
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createValues, setCreateValues] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchItems = async () => {
      try {
        const result = await loadItems();
        if (isMounted) {
          setItems(result);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : `Failed to load ${title.toLowerCase()}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchItems();

    return () => {
      isMounted = false;
    };
  }, [loadItems, title]);

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
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!isLoading && !error ? (
        items.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const id = String(item._id || item.id || '');
                  return (
                    <tr key={id || getDisplayName(item)}>
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
