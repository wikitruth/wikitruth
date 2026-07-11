import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/common/Alert';
import { User } from '../../../types';

interface MemberDirectoryPageProps {
  title: string;
  subtitle?: string;
  tab: 'contributors' | 'screeners' | 'reviewers' | 'administrators';
  fetchMembers: () => Promise<User[]>;
}

const MemberDirectoryPage: React.FC<MemberDirectoryPageProps> = ({ title, subtitle, tab, fetchMembers }) => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await fetchMembers();
        setMembers(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fetchMembers]);

  if (loading) {
    return <LoadingSpinner message={`Loading ${title.toLowerCase()}...`} />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <div>
      <h1 className="page-header wt-header">
        <i className="fa fa-user-circle"></i> Members
      </h1>
      <ul className="nav nav-tabs wt-tabs" role="tablist">
        <li role="presentation" className={tab === 'contributors' ? 'active' : ''}>
          <Link to="/members" role="tab">
            <i className="fa fa-user-circle"></i> Contributors
          </Link>
        </li>
        <li role="presentation" className={tab === 'screeners' ? 'active' : ''}>
          <Link to="/members/screeners" role="tab">
            <i className="fa fa-user-circle"></i> Screeners
          </Link>
        </li>
        <li role="presentation" className={tab === 'reviewers' ? 'active' : ''}>
          <Link to="/members/reviewers" role="tab">
            <i className="fa fa-user-circle"></i> Reviewers
          </Link>
        </li>
        <li role="presentation" className={tab === 'administrators' ? 'active' : ''}>
          <Link to="/members/administrators" role="tab">
            <i className="fa fa-user-circle"></i> Administrators
          </Link>
        </li>
      </ul>

      <h3 className="page-header">{title}</h3>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}

      <div className="row">
        {members.length === 0 ? (
          <div className="col-sm-12">
            <p className="text-muted">No members found.</p>
          </div>
        ) : (
          members.map((member) => {
            const displayName = typeof member.name === 'string'
              ? member.name
              : member.name?.full || member.username;

            return (
              <div key={member._id} className="col-lg-4 col-md-6 col-sm-6">
                <div className="media wt-category">
                  <div className="media-left media-top">
                    <Link to={`/members/${member.username}`}>
                      <div className="photo-placeholder" title={member.username}></div>
                    </Link>
                  </div>
                  <div className="media-body">
                    <h4 className="media-heading">
                      <Link to={`/members/${member.username}`}>{displayName}</Link>
                      <div>
                        <span style={{ fontSize: '16px' }} className="text-muted">
                          {member.username}
                        </span>
                      </div>
                      {member.reputation ? (
                        <div style={{ marginTop: 4 }}>
                          <span className="label label-info" title={member.reputation.level}>
                            Score {member.reputation.score}
                          </span>{' '}
                          <span className="text-muted small">{member.reputation.level}</span>
                        </div>
                      ) : null}
                    </h4>
                    <div>
                      <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i>&nbsp;
                      <Link to={`/members/${member.username}`} role="button">
                        view profile
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <br />
      <br />
    </div>
  );
};

export default MemberDirectoryPage;
