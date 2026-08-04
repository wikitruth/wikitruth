import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ProfileShell from '../../../components/Members/ProfileShell';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';

const ProfileTopics: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const username = routeUsername || user?.username || '';
  const [topics, setTopics] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTopics = async () => {
      if (!username) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.getMemberTopics(username, 100);
        setTopics(Array.isArray(result?.topics) ? result.topics : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [username]);

  if (loading) {
    return <LoadingSpinner message="Loading profile topics..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <ProfileShell username={username} activeTab="topics" isOwnProfile={Boolean(user?.username && user.username === username)}>
      <div style={{ marginTop: '20px' }}>
        <Link className="btn btn-default" to="/topics/create" role="button">
          <i className="fa fa-folder-open"></i> New Category
        </Link>
      </div>
      <ul className="list-group wt-list" style={{ marginTop: '20px' }}>
        {topics.length === 0 ? (
          <li className="list-group-item">No topics found.</li>
        ) : (
          topics.map((topic) => (
            <li key={topic._id} className="list-group-item">
              <Link to={`/topics/entry/${topic.friendlyUrl || topic._id}/${topic._id}`}>
                {topic.title || '(Untitled)'}
              </Link>
              {topic.editDate && (
                <span className="text-muted pull-right">
                  {new Date(topic.editDate).toLocaleDateString()}
                </span>
              )}
            </li>
          ))
        )}
      </ul>
    </ProfileShell>
  );
};

export default ProfileTopics;
