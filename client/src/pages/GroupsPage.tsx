import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiService } from '../services/api';
import { Group } from '../types';

const GroupsPage: React.FC = () => {
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [privateGroups, setPrivateGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await apiService.getGroups();
        setPublicGroups((data.publicGroups || []) as unknown as Group[]);
        setPrivateGroups((data.privateGroups || []) as unknown as Group[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load groups');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading groups..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="alert alert-danger">{error}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="col-md-12">
        <h2>Groups</h2>
        
        <div className="row">
          <div className="col-md-12">
            <Link to="/" className="btn btn-default">
              <span className="glyphicon glyphicon-arrow-left"></span> Back to Home
            </Link>
            {' '}
            <Link to="/groups/create" className="btn btn-primary">
              <span className="glyphicon glyphicon-plus"></span> Create Group
            </Link>
          </div>
        </div>

        <div className="row" style={{ marginTop: '20px' }}>
          <div className="col-md-6">
            <h3>Public Groups</h3>
            {publicGroups.length === 0 ? (
              <p className="text-muted">No public groups found.</p>
            ) : (
              <ul className="list-group">
                {publicGroups.map((group) => (
                  <li key={group._id} className="list-group-item">
                    <h4>
                      <Link to={`/groups/${group.friendlyUrl}/${group._id}`}>
                        {group.title}
                      </Link>
                    </h4>
                    {group.description && (
                      <p className="text-muted">{group.description}</p>
                    )}
                    <small className="text-muted">
                      {group.members?.length || 0} member(s)
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {privateGroups.length > 0 && (
            <div className="col-md-6">
              <h3>Private Groups</h3>
              <ul className="list-group">
                {privateGroups.map((group) => (
                  <li key={group._id} className="list-group-item">
                    <h4>
                      <Link to={`/groups/${group.friendlyUrl}/${group._id}`}>
                        {group.title}
                      </Link>
                    </h4>
                    {group.description && (
                      <p className="text-muted">{group.description}</p>
                    )}
                    <small className="text-muted">
                      {group.members?.length || 0} member(s)
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GroupsPage;
