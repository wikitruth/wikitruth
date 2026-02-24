import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import type { LegacyEntity, LegacyResponse } from '../../../types/legacy';

const GroupPosts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<LegacyEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id) {
        setError('Group ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = (await apiService.getGroupEntry(id)) as LegacyResponse;
        setGroup((result?.group || result) as LegacyEntity);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading group posts..." />;
  }

  if (error || !group) {
    return <Alert type="danger">{error || 'Group not found'}</Alert>;
  }

  return (
    <div className="container">
      <h2>{group.title} Posts</h2>
      <p className="text-muted">Posts stream is available in legacy flow while modern posting tools are being finalized.</p>
      <Alert type="info">
        Legacy comparison route: <a href={`/groups/${group._id}/posts`} target="_blank" rel="noopener noreferrer">open legacy posts</a>
      </Alert>
      <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`} className="btn btn-default">
        <i className="fa fa-arrow-left"></i> Back to Group
      </Link>
    </div>
  );
};

export default GroupPosts;
