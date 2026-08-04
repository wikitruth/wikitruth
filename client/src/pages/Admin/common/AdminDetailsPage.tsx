import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { AdminMutationPayload, AdminRecord } from '../../../services/api/admin';

interface AdminDetailsPageProps {
  title: string;
  backPath: string;
  loadItem: (id: string) => Promise<AdminRecord | null>;
  updateAction?: {
    fields: {
      path: string;
      label: string;
      type?: 'text' | 'email' | 'checkbox';
      required?: boolean;
      placeholder?: string;
    }[];
    onUpdate: (id: string, payload: AdminMutationPayload) => Promise<AdminRecord | null>;
  };
  deleteAction?: {
    confirmMessage: string;
    onDelete: (id: string) => Promise<unknown>;
  };
  hiddenFields?: string[];
  embedded?: boolean;
  showRecord?: boolean;
}

const SENSITIVE_FIELD_NAMES = new Set([
  'accesstoken',
  'clientsecret',
  'clientsecrethash',
  'credential',
  'credentials',
  'hashedpassword',
  'password',
  'passwordhash',
  'recoverycode',
  'recoverycodes',
  'refreshtoken',
  'secret',
  'token',
]);

function isSensitiveField(key: string): boolean {
  return SENSITIVE_FIELD_NAMES.has(key.replace(/[^a-z0-9]/gi, '').toLowerCase());
}

function formatValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, (key, nestedValue) =>
    key && isSensitiveField(key) ? '[redacted]' : nestedValue
  );
}

function getValueAtPath(source: AdminRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, source);
}

function setValueAtPath(target: AdminMutationPayload, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

const AdminDetailsPage: React.FC<AdminDetailsPageProps> = ({
  title,
  backPath,
  loadItem,
  updateAction,
  deleteAction,
  hiddenFields = [],
  embedded = false,
  showRecord = true,
}) => {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const [item, setItem] = useState<AdminRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchItem = async () => {
      try {
        setError(null);
        const result = await loadItem(id);
        if (!isMounted) {
          return;
        }

        if (!result) {
          setError('Entry not found');
          return;
        }

        setItem(result);
        if (updateAction) {
          const initialValues: Record<string, string | boolean> = {};
          updateAction.fields.forEach(field => {
            const fieldValue = getValueAtPath(result, field.path);
            if (field.type === 'checkbox') {
              initialValues[field.path] = Boolean(fieldValue);
              return;
            }
            initialValues[field.path] =
              typeof fieldValue === 'string' ? fieldValue : String(fieldValue || '');
          });
          setFormValues(initialValues);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error ? loadError.message : `Failed to load ${title.toLowerCase()}`
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      void fetchItem();
    } else {
      setError('Missing entry id');
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id, loadItem, retryVersion, title, updateAction]);

  const handleFieldChange = (path: string, value: string | boolean) => {
    setFormValues(previous => ({ ...previous, [path]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !updateAction) {
      return;
    }

    const payload: AdminMutationPayload = {};
    for (const field of updateAction.fields) {
      const rawValue = formValues[field.path];
      if (field.type === 'checkbox') {
        setValueAtPath(payload, field.path, Boolean(rawValue));
        continue;
      }

      const value = String(rawValue || '').trim();
      if (field.required && !value) {
        setMutationError(`${field.label} is required.`);
        return;
      }
      setValueAtPath(payload, field.path, value);
    }

    try {
      setIsSaving(true);
      setMutationError(null);
      setMutationSuccess(null);
      const updatedItem = await updateAction.onUpdate(id, payload);
      if (updatedItem) {
        setItem(updatedItem);
      }
      setMutationSuccess('Saved successfully.');
    } catch (updateError) {
      setMutationError(
        updateError instanceof Error
          ? updateError.message
          : `Failed to update ${title.toLowerCase()}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !deleteAction) {
      return;
    }

    if (!window.confirm(deleteAction.confirmMessage)) {
      return;
    }

    try {
      setIsDeleting(true);
      setMutationError(null);
      setMutationSuccess(null);
      await deleteAction.onDelete(id);
      navigate(backPath);
    } catch (deleteError) {
      setMutationError(
        deleteError instanceof Error
          ? deleteError.message
          : `Failed to delete ${title.toLowerCase()}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={embedded ? 'wt-admin-basic-details' : 'container wt-admin-basic-details'}>
      {!embedded ? <div className="wt-admin-basic-details-header">
        <h1 className="h3">{title}</h1>
        <Link to={backPath} className="btn btn-default btn-sm">
          Back to list
        </Link>
      </div> : null}

      {isLoading ? <p className="text-muted">Loading...</p> : null}
      {error ? (
        <div className="alert alert-danger">
          {error}{' '}
          {id ? (
            <button
              type="button"
              className="btn btn-link btn-xs"
              onClick={() => {
                setIsLoading(true);
                setRetryVersion(current => current + 1);
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !error && item ? (
        <div>
          {updateAction ? (
            <form className="panel panel-default" onSubmit={handleUpdateSubmit}>
              <div className="panel-heading">
                <strong>Edit</strong>
              </div>
              <div className="panel-body">
                <div className="row">
                  {updateAction.fields.map(field => (
                    <div
                      className={
                        field.type === 'checkbox' ? 'col-sm-12 form-group' : 'col-sm-6 form-group'
                      }
                      key={field.path}
                    >
                      {field.type === 'checkbox' ? (
                        <label style={{ fontWeight: 400 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(formValues[field.path])}
                            onChange={event => handleFieldChange(field.path, event.target.checked)}
                          />{' '}
                          {field.label}
                        </label>
                      ) : (
                        <>
                          <label htmlFor={`${title}-${field.path}`}>{field.label}</label>
                          <input
                            id={`${title}-${field.path}`}
                            type={field.type || 'text'}
                            className="form-control"
                            value={String(formValues[field.path] || '')}
                            placeholder={field.placeholder}
                            onChange={event => handleFieldChange(field.path, event.target.value)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {mutationError ? <div className="alert alert-danger">{mutationError}</div> : null}
                {mutationSuccess ? (
                  <div className="alert alert-success">{mutationSuccess}</div>
                ) : null}
                <button className="btn btn-primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
                {deleteAction ? (
                  <button
                    className="btn btn-danger"
                    type="button"
                    style={{ marginLeft: 8 }}
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {showRecord ? <div className="table-responsive wt-admin-record-table">
            <table className="table table-bordered">
              <tbody>
                {Object.entries(item)
                  .filter(([key]) => key !== '__v' && !hiddenFields.includes(key) && !isSensitiveField(key))
                  .map(([key, value]) => (
                    <tr key={key}>
                      <th style={{ width: '30%' }}>{key}</th>
                      <td style={{ wordBreak: 'break-word' }}>{formatValue(value)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div> : null}
        </div>
      ) : null}
    </div>
  );
};

export default AdminDetailsPage;
