import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import type { LegacyEntity } from '../../../types/legacy';
import { useAuth } from '../../../context/AuthContext';
import GroupNavigation from '../../../components/Groups/GroupNavigation';
import DeterministicAvatar from '../../../components/common/DeterministicAvatar';

const GroupMembers: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
        const result = await apiService.getGroupEntry(id);
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
  const currentUserId = String(user?._id || '');
  const isManager = Boolean(
    String(group.createUserId || '') === currentUserId ||
      members.some((member) => {
        const memberId = String((member.userId as LegacyEntity)?._id || member.userId || '');
        return memberId === currentUserId && Number(member.roleType || 10) === 20;
      }) ||
      Boolean(user?.roles?.admin)
  );
  const administrators = members.filter((member) => Number(member.roleType || 10) === 20);

  const renderMembers = (entries: LegacyEntity[], emptyMessage: string) => {
    if (!entries.length) {
      return <li className="list-group-item">{emptyMessage}</li>;
    }

    return entries.map((member, index: number) => {
      const memberUser = typeof member.userId === 'string' ? null : member.userId;
      const memberId = String(memberUser?._id || member?.userId || '');
      const username = memberUser?.username || memberId || 'Unknown user';

      return (
        <li key={memberId || index} className="list-group-item">
          <div className="media">
            <div className="media-left media-middle">
              <Link to={`/members/${encodeURIComponent(username)}`}>
                <DeterministicAvatar seed={memberId || username} label={username} size={36} />
              </Link>
            </div>
            <div className="media-body media-middle">
              <strong>
                <Link to={`/members/${encodeURIComponent(username)}`}>{username}</Link>
              </strong>
            </div>
          </div>
        </li>
      );
    });
  };

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

      <PageHeader
        title={`${group.title} Members`}
        subtitle={`${members.length} member(s)`}
        icon="users"
        iconColor="text-primary"
        actions={
          isManager ? (
            <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`} className="btn btn-default">
              <i className="fa fa-plus"></i> Add
            </Link>
          ) : undefined
        }
      />

      <GroupNavigation group={group} activeTab="members" />

      <div className="panel panel-default" style={{ marginTop: 20 }}>
        <div className="panel-heading">
          <h3 className="panel-title">Administrators</h3>
        </div>
        <ul className="list-group">{renderMembers(administrators, 'No administrators found.')}</ul>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">All Members</h3>
        </div>
        <ul className="list-group">
          {renderMembers(members, 'No members found.')}
        </ul>
      </div>
    </div>
  );
};

export default GroupMembers;
