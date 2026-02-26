import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../../../../components/common/Breadcrumb';
import PageHeader from '../../../../components/common/PageHeader';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import Alert from '../../../../components/common/Alert';
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
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Profile', url: '/members/profile' },
          { title: 'Pages', active: true },
        ]}
      />

      <PageHeader
        title="Profile Pages"
        subtitle="Manage your custom profile pages"
        icon="file-text-o"
        iconColor="text-primary"
        actions={
          <Link to="/members/profile/pages/create" className="btn btn-primary">
            <i className="fa fa-plus"></i> Create Page
          </Link>
        }
      />

      <div className="panel panel-default">
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
    </div>
  );
};

export default PagesIndex;
