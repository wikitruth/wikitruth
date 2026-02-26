import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/common/Alert';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';

const ProfilePage: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const username = routeUsername || user?.username || '';
  const [profile, setProfile] = useState<LegacyEntity | null>(null);
  const [pages, setPages] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = useMemo(() => {
    return Boolean(user?.username && username && user.username === username);
  }, [user?.username, username]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [profileResult, pagesResult] = await Promise.all([
          apiService.getMemberProfile(username),
          apiService.getMemberPages(username),
        ] as const);

        setProfile((profileResult?.member || profileResult) as LegacyEntity);
        setPages(Array.isArray(pagesResult?.pages) ? pagesResult.pages : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (error || !profile) {
    return <Alert type="danger">{error || 'Profile not found'}</Alert>;
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Members', url: '/members' },
          { title: profile.username, active: true },
        ]}
      />

      <PageHeader
        title={`@${profile.username}`}
        subtitle={profile.preferences?.privateProfile ? 'Private profile' : 'Public profile'}
        icon="user"
        iconColor="text-primary"
        actions={
          isOwnProfile ? (
            <Link to="/members/profile/settings" className="btn btn-default">
              <i className="fa fa-cog"></i> Profile Settings
            </Link>
          ) : undefined
        }
      />

      <div className="panel panel-default">
        <div className="panel-body">
          <p>
            <strong>Username:</strong> {profile.username}
          </p>
          {profile.email && !profile.preferences?.privateProfile && (
            <p>
              <strong>Email:</strong> {profile.email}
            </p>
          )}
          <p>
            <strong>Public profile:</strong> {profile.preferences?.privateProfile ? 'No' : 'Yes'}
          </p>
        </div>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Custom Pages</h3>
        </div>
        <ul className="list-group">
          {pages.length === 0 ? (
            <li className="list-group-item">No custom pages yet.</li>
          ) : (
            pages.map((page) => (
              <li key={page._id} className="list-group-item">
                <Link to={isOwnProfile ? `/members/profile/pages/${page._id}` : `/members/${profile.username}/pages/${page._id}`}>
                  {page.title}
                </Link>
              </li>
            ))
          )}
        </ul>
        {isOwnProfile && (
          <div className="panel-footer">
            <Link to="/members/profile/pages/create" className="btn btn-primary btn-sm">
              <i className="fa fa-plus"></i> Create Page
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
