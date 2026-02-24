import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiService } from '../services/api';
import { User } from '../types';
import type { LegacyResponse } from '../types/legacy';

const MembersPage: React.FC = () => {
  const [contributors, setContributors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = (await apiService.getMembers()) as LegacyResponse;
        setContributors((data.contributors || []) as User[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading members..." />
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
        <h2>Contributors</h2>
        
        <div className="row">
          <div className="col-md-12">
            <Link to="/" className="btn btn-default">
              <span className="glyphicon glyphicon-arrow-left"></span> Back to Home
            </Link>
          </div>
        </div>

        <div className="row" style={{ marginTop: '20px' }}>
          <div className="col-md-12">
            {contributors.length === 0 ? (
              <p className="text-muted">No contributors found.</p>
            ) : (
              <div className="list-group">
                {contributors.map((member) => (
                  <div key={member._id} className="list-group-item">
                    <div className="media">
                      <div className="media-left">
                        <span className="glyphicon glyphicon-user" style={{ fontSize: '32px' }}></span>
                      </div>
                      <div className="media-body">
                        <h4 className="media-heading">
                          <Link to={`/members/${member.username}`}>
                            {typeof member.name === 'string' ? member.name : member.name?.full || member.username}
                          </Link>
                        </h4>
                        <p className="text-muted">
                          @{member.username}
                          {member.roles?.screener && <span className="label label-info" style={{ marginLeft: '10px' }}>Screener</span>}
                          {member.roles?.reviewer && <span className="label label-success" style={{ marginLeft: '10px' }}>Reviewer</span>}
                          {member.roles?.admin && <span className="label label-danger" style={{ marginLeft: '10px' }}>Admin</span>}
                        </p>
                        {member.email && !member.preferences?.privateProfile && (
                          <p><small className="text-muted">{member.email}</small></p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MembersPage;
