import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/common/Alert';
import { User } from '../../../types';

interface MemberDirectoryPageProps {
  title: string;
  subtitle: string;
  fetchMembers: () => Promise<User[]>;
}

const MemberDirectoryPage: React.FC<MemberDirectoryPageProps> = ({ title, subtitle, fetchMembers }) => {
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
    <div className="container">
      <h2>{title}</h2>
      <p className="text-muted">{subtitle}</p>

      <ul className="list-group">
        {members.length === 0 ? (
          <li className="list-group-item">No members found.</li>
        ) : (
          members.map((member) => (
            <li key={member._id} className="list-group-item">
              <strong>{member.name && typeof member.name !== 'string' ? member.name.full || member.username : member.username}</strong>
              <div className="text-muted">@{member.username}</div>
              <Link to={`/members/${member.username}`}>View profile</Link>
            </li>
          ))
        )}
      </ul>

      <Link to="/members" className="btn btn-default">
        <i className="fa fa-arrow-left"></i> Back to Members
      </Link>
    </div>
  );
};

export default MemberDirectoryPage;
