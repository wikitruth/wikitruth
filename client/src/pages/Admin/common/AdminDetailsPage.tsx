import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AdminRecord } from '../../../services/api/admin';

interface AdminDetailsPageProps {
  title: string;
  backPath: string;
  loadItem: (id: string) => Promise<AdminRecord | null>;
}

function formatValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

const AdminDetailsPage: React.FC<AdminDetailsPageProps> = ({ title, backPath, loadItem }) => {
  const { id = '' } = useParams<{ id: string }>();
  const [item, setItem] = useState<AdminRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchItem = async () => {
      try {
        const result = await loadItem(id);
        if (!isMounted) {
          return;
        }

        if (!result) {
          setError('Entry not found');
          return;
        }

        setItem(result);
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

    if (id) {
      void fetchItem();
    } else {
      setError('Missing entry id');
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id, loadItem, title]);

  return (
    <div className="container">
      <h3>{title}</h3>
      <p>
        <Link to={backPath} className="btn btn-default btn-sm">
          Back to list
        </Link>
      </p>

      {isLoading ? <p className="text-muted">Loading...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!isLoading && !error && item ? (
        <div className="table-responsive">
          <table className="table table-bordered">
            <tbody>
              {Object.entries(item)
                .filter(([key]) => key !== '__v')
                .map(([key, value]) => (
                  <tr key={key}>
                    <th style={{ width: '30%' }}>{key}</th>
                    <td style={{ wordBreak: 'break-word' }}>{formatValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default AdminDetailsPage;
