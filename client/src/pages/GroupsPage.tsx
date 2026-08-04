import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiService } from '../services/api';
import { Group } from '../types';
import PageMeta from '../components/common/PageMeta';

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
    return <LoadingSpinner message="Loading groups..." />;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <PageMeta title="Groups" />
      <h1 className="page-header wt-header-2">
        <i className="fa fa-group"></i> Groups
        <div className="pull-right" style={{ paddingTop: '8px', paddingBottom: '8px', fontSize: '28px' }}>
          <Link to="/groups/create" className="text-muted-2 no-underline">
            <i className="fa fa-plus"></i> Create
          </Link>
        </div>
      </h1>

      <div className="row">
        {publicGroups.length === 0 && privateGroups.length === 0 ? (
          <div className="col-sm-12">
            <p className="text-muted">No groups found.</p>
          </div>
        ) : (
          [...publicGroups, ...privateGroups].map((group) => (
            <div key={group._id} className="col-lg-4 col-md-6 col-sm-6">
              <div className="media wt-category">
                <div className="media-left media-top">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`}>
                    <div className="photo-placeholder" title={group.title}></div>
                  </Link>
                </div>
                <div className="media-body">
                  <h4 className="media-heading">
                    <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`}>
                      {group.title}
                    </Link>
                    {group.description && (
                      <div>
                        <span style={{ fontSize: '16px' }} className="text-muted">
                          {group.description}
                        </span>
                      </div>
                    )}
                  </h4>
                  <div>
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i>&nbsp;
                    <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`} role="button">
                      view group
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <br />
    </div>
  );
};

export default GroupsPage;
