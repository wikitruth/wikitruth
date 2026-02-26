import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import Alert from '../../../../components/common/Alert';
import ProfileShell from '../../../../components/Members/ProfileShell';
import apiService from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';
import type { LegacyEntity } from '../../../../types/legacy';

const PagesIndex: React.FC = () => {
  const { user } = useAuth();
  const username = user?.username || '';
  const [pages, setPages] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      if (!username) {
        setError('You must be signed in to manage profile pages');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.getMemberPages(username);
        setPages(Array.isArray(result?.pages) ? result.pages : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile pages');
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [username]);

  if (loading) {
    return <LoadingSpinner message="Loading profile pages..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <ProfileShell username={username} activeTab="pages" isOwnProfile={true}>
      <div style={{ marginTop: '20px' }}>
        <Link to="/members/profile/pages/create" className="btn btn-primary">
          <i className="fa fa-plus"></i> Create Page
        </Link>
      </div>

      <div className="panel panel-default" style={{ marginTop: '20px' }}>
        <ul className="list-group">
          {pages.length === 0 ? (
            <li className="list-group-item">No pages yet.</li>
          ) : (
            pages.map((page) => (
              <li key={page._id} className="list-group-item">
                <Link to={`/members/profile/pages/${page._id}`}>{page.title}</Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </ProfileShell>
  );
};

export default PagesIndex;
