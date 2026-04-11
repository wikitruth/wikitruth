import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/common/Alert';
import ProfileShell from '../../../components/Members/ProfileShell';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';
import PageMeta from '../../../components/common/PageMeta';
import GeoPatternBackground from '../../../components/common/GeoPatternBackground';

const ProfilePage: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const username = routeUsername || user?.username || '';
  const [profile, setProfile] = useState<LegacyEntity | null>(null);
  const [pages, setPages] = useState<LegacyEntity[]>([]);
  const [contributionStats, setContributionStats] = useState<Record<string, number>>({});
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
        const [profileResult, pagesResult, contributionsResult] = await Promise.all([
          apiService.getMemberProfile(username),
          apiService.getMemberPages(username),
          apiService.getMemberContributions(username, 'all'),
        ] as const);

        setProfile((profileResult?.member || profileResult) as LegacyEntity);
        setPages(Array.isArray(pagesResult?.pages) ? pagesResult.pages : []);
        setContributionStats({
          topics: Array.isArray(contributionsResult?.topics) ? contributionsResult.topics.length : 0,
          arguments: Array.isArray(contributionsResult?.arguments) ? contributionsResult.arguments.length : 0,
          questions: Array.isArray(contributionsResult?.questions) ? contributionsResult.questions.length : 0,
          answers: Array.isArray(contributionsResult?.answers) ? contributionsResult.answers.length : 0,
          artifacts: Array.isArray(contributionsResult?.artifacts) ? contributionsResult.artifacts.length : 0,
          issues: Array.isArray(contributionsResult?.issues) ? contributionsResult.issues.length : 0,
          opinions: Array.isArray(contributionsResult?.opinions) ? contributionsResult.opinions.length : 0,
        });
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
      <PageMeta title={`${profile.username || 'User'} - Profile`} />
      <GeoPatternBackground seed={profile.username || 'user'} height={120} />
      <ProfileShell
        username={profile.username}
        activeTab="overview"
        isOwnProfile={isOwnProfile}
        roles={{
          admin: profile.roles?.admin,
          screener: profile.roles?.screener,
          reviewer: profile.roles?.reviewer,
        }}
      >
        <div className="row" style={{ marginTop: '15px' }}>
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions`} className="no-underline">
            <div className="col-sm-12">
              <div className="well stat">
                <div className="stat-value">
                  {(contributionStats.topics || 0) +
                    (contributionStats.arguments || 0) +
                    (contributionStats.questions || 0) +
                    (contributionStats.answers || 0) +
                    (contributionStats.artifacts || 0) +
                    (contributionStats.issues || 0) +
                    (contributionStats.opinions || 0)}
                </div>
                <div className="stat-label">Contributions</div>
              </div>
            </div>
          </Link>
        </div>
        <div className="row">
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions?tab=topics`} className="no-underline">
            <div className="col-sm-4">
              <div className="well stat">
                <div className="stat-value">{contributionStats.topics || 0}</div>
                <div className="stat-label">Topics</div>
              </div>
            </div>
          </Link>
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions?tab=arguments`} className="no-underline">
            <div className="col-sm-4">
              <div className="well stat">
                <div className="stat-value">{contributionStats.arguments || 0}</div>
                <div className="stat-label">Facts</div>
              </div>
            </div>
          </Link>
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions?tab=questions`} className="no-underline">
            <div className="col-sm-4">
              <div className="well stat">
                <div className="stat-value">{contributionStats.questions || 0}</div>
                <div className="stat-label">Questions</div>
              </div>
            </div>
          </Link>
        </div>
        <div className="row">
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions?tab=answers`} className="no-underline">
            <div className="col-sm-4">
              <div className="well stat">
                <div className="stat-value">{contributionStats.answers || 0}</div>
                <div className="stat-label">Answers</div>
              </div>
            </div>
          </Link>
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions?tab=artifacts`} className="no-underline">
            <div className="col-sm-4">
              <div className="well stat">
                <div className="stat-value">{contributionStats.artifacts || 0}</div>
                <div className="stat-label">Artifacts</div>
              </div>
            </div>
          </Link>
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions?tab=issues`} className="no-underline">
            <div className="col-sm-4">
              <div className="well stat">
                <div className="stat-value">{contributionStats.issues || 0}</div>
                <div className="stat-label">Issues</div>
              </div>
            </div>
          </Link>
        </div>
        <div className="row">
          <Link to={`${isOwnProfile ? '/members/profile' : `/members/${profile.username}`}/contributions?tab=opinions`} className="no-underline">
            <div className="col-sm-4">
              <div className="well stat">
                <div className="stat-value">{contributionStats.opinions || 0}</div>
                <div className="stat-label">Comments</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="panel panel-default" style={{ marginTop: '20px' }}>
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
            {isOwnProfile && (
              <p style={{ marginBottom: 0 }}>
                <Link to="/members/profile/settings" className="no-underline">
                  <i className="fa fa-cog"></i> Settings
                </Link>
              </p>
            )}
            {!isOwnProfile && (
              <p style={{ marginBottom: 0 }}>
                <Link to="#" className="no-underline">
                  <i className="fa fa-rss"></i> Follow
                </Link>
              </p>
            )}
          </div>
        </div>

        <p>Account Details</p>
        <p>Reputation</p>
        <p>Timeline &amp; Activities</p>

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
      </ProfileShell>
    </div>
  );
};

export default ProfilePage;
