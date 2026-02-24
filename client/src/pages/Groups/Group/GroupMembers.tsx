import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import type { LegacyEntity, LegacyResponse } from '../../../types/legacy';

const GroupMembers: React.FC = () => {
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
        setLoading(true);
        const result = (await apiService.getGroupEntry(id)) as LegacyResponse;
        setGroup((result?.group || result) as LegacyEntity);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group members');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading members..." />;
  }

  if (error || !group) {
    return <Alert type="danger">{error || 'Group not found'}</Alert>;
  }

  const members = Array.isArray(group.members) ? group.members : [];

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Groups', url: '/groups' },
          { title: group.title, url: `/groups/${group.friendlyUrl || group._id}/${group._id}` },
          { title: 'Members', active: true },
        ]}
      />

      <PageHeader title={`${group.title} Members`} subtitle={`${members.length} member(s)`} icon="users" iconColor="text-primary" />

      <div className="panel panel-default">
        <ul className="list-group">
          {members.length === 0 ? (
            <li className="list-group-item">No members found.</li>
          ) : (
            members.map((member, index: number) => {
              const memberUser = typeof member.userId === 'string' ? null : member.userId;
              const memberId = String(memberUser?._id || member?.userId || '');
              const username = memberUser?.username || memberId || 'Unknown user';
              const roleType = Number(member?.roleType || 10);
              const roleLabel = roleType === 20 ? 'Administrator' : 'Member';

              return (
                <li key={memberId || index} className="list-group-item">
                  <strong>{username}</strong>
                  <span className="label label-default" style={{ marginLeft: '8px' }}>
                    {roleLabel}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`} className="btn btn-default">
        <i className="fa fa-arrow-left"></i> Back to Group
      </Link>
    </div>
  );
};

export default GroupMembers;
