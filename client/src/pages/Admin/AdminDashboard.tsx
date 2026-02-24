import React, { useEffect, useState } from 'react';
import adminApi from '../../services/api/admin';

interface DashboardCounts {
  users?: number;
  accounts?: number;
  categories?: number;
  statuses?: number;
}

const AdminDashboard: React.FC = () => {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        const data = (await adminApi.dashboard()) as { counts?: DashboardCounts };
        if (isMounted) {
          setCounts(data.counts || null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="container">
      <h2>Admin Dashboard</h2>
      <p className="text-muted">Administrative controls and system overview.</p>

      {isLoading ? <p className="text-muted">Loading dashboard...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!isLoading && !error && counts ? (
        <div className="row">
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Users</div>
              <div className="panel-body">
                <strong>{counts.users || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Accounts</div>
              <div className="panel-body">
                <strong>{counts.accounts || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Categories</div>
              <div className="panel-body">
                <strong>{counts.categories || 0}</strong>
              </div>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="panel panel-default">
              <div className="panel-heading">Statuses</div>
              <div className="panel-body">
                <strong>{counts.statuses || 0}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
