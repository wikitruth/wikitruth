import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminRecord } from '../../../services/api/admin';

interface AdminListPageProps {
  title: string;
  subtitle: string;
  emptyMessage: string;
  detailPath: string;
  loadItems: () => Promise<AdminRecord[]>;
}

function getDisplayName(item: AdminRecord): string {
  return (
    String(item.name || item.title || item.username || item.email || '').trim() ||
    String(item._id || item.id || 'Unnamed item')
  );
}

const AdminListPage: React.FC<AdminListPageProps> = ({ title, subtitle, emptyMessage, detailPath, loadItems }) => {
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="container">
      <h3>{title}</h3>
      <p className="text-muted">{subtitle}</p>

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
