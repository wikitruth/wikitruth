import React, { useEffect, useState } from 'react';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const ProfileContributions: React.FC = () => {
  const { user } = useAuth();
  const username = user?.username || '';
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!username) {
        setError('You must be signed in to view your contributions');
        setLoading(false);
        return;
      }
      try {
        const result: any = await apiService.getMemberPages(username);
        setPages(result?.pages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contributions');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [username]);

  if (loading) {
    return <LoadingSpinner message="Loading contributions..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <div className="container">
      <h2>Profile Contributions</h2>
      <p className="text-muted">Recent profile page contributions.</p>
      <ul className="list-group">
        {pages.length === 0 ? (
          <li className="list-group-item">No contributions yet.</li>
        ) : (
          pages.map((page) => (
            <li key={page._id} className="list-group-item">
              {page.title}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ProfileContributions;
