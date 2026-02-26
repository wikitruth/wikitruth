import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ProfileShell from '../../../components/Members/ProfileShell';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';

const ProfileFollowing: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const username = routeUsername || user?.username || '';
  const [people, setPeople] = useState<LegacyEntity[]>([]);
  const [topics, setTopics] = useState<LegacyEntity[]>([]);
  const [groups, setGroups] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFollowing = async () => {
      if (!username) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.getMemberFollowing(username);
        const following = result?.following || {};
        setPeople(Array.isArray(following.people) ? following.people : Array.isArray(following.users) ? following.users : []);
        setTopics(Array.isArray(following.topics) ? following.topics : []);
        setGroups(Array.isArray(following.groups) ? following.groups : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load following data');
      } finally {
        setLoading(false);
      }
    };

    loadFollowing();
  }, [username]);

  if (loading) {
    return <LoadingSpinner message="Loading following data..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <ProfileShell username={username} activeTab="following" isOwnProfile={Boolean(user?.username && user.username === username)}>
      <p style={{ fontWeight: 'normal', marginTop: '20px' }} className="text-muted">
        Relationship signals derived from member activity for {username}.
      </p>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">People</h3>
        </div>
        <ul className="list-group">
          {people.length === 0 ? (
            <li className="list-group-item">No connected people found.</li>
          ) : (
            people.map((person) => (
              <li key={person._id} className="list-group-item">
                <Link to={`/members/${person.username}`}>@{person.username}</Link>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Topics</h3>
        </div>
        <ul className="list-group">
          {topics.length === 0 ? (
            <li className="list-group-item">No connected topics found.</li>
          ) : (
            topics.map((topic) => (
              <li key={topic._id} className="list-group-item">
                <Link to={`/topics/entry/${topic.friendlyUrl || topic._id}/${topic._id}`}>
                  {topic.title || '(Untitled)'}
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Groups</h3>
        </div>
        <ul className="list-group">
          {groups.length === 0 ? (
            <li className="list-group-item">No groups found.</li>
          ) : (
            groups.map((group) => (
              <li key={group._id} className="list-group-item">
                <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`}>
                  {group.title || '(Untitled)'}
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </ProfileShell>
  );
};

export default ProfileFollowing;
