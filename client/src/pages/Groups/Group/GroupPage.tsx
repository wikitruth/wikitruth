import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Input from '../../../components/Form/Input';
import TextArea from '../../../components/Form/TextArea';
import Select from '../../../components/Form/Select';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';
import GeoPatternBackground from '../../../components/common/GeoPatternBackground';
import GroupNavigation from '../../../components/Groups/GroupNavigation';

const EMPTY_TOTALS = {
  topics: 0,
  arguments: 0,
  questions: 0,
  answers: 0,
  artifacts: 0,
  issues: 0,
  opinions: 0,
  contributions: 0,
};

const GroupPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<LegacyEntity | null>(null);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', privacyType: '10' });

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id) {
        setError('Group ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [entryResult, statsResult] = await Promise.all([
          apiService.getGroupEntry(id),
          apiService.getGroupStats(id).catch(() => null),
        ]);
        const groupModel = (entryResult?.group || entryResult) as LegacyEntity;
        setGroup(groupModel);
        const nextTotals = statsResult?.totals || EMPTY_TOTALS;
        setTotals({
          topics: Number(nextTotals.topics || 0),
          arguments: Number(nextTotals.arguments || 0),
          questions: Number(nextTotals.questions || 0),
          answers: Number(nextTotals.answers || 0),
          artifacts: Number(nextTotals.artifacts || 0),
          issues: Number(nextTotals.issues || 0),
          opinions: Number(nextTotals.opinions || 0),
          contributions: Number(nextTotals.contributions || 0),
        });
        setForm({
          title: groupModel?.title || '',
          description: groupModel?.description || '',
          privacyType: String(groupModel?.privacyType || 10),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  const currentUserId = String(user?._id || '');

  const members: LegacyEntity[] = Array.isArray(group?.members) ? group.members : [];
  const isMember = members.some((member) => String((member.userId as LegacyEntity)?._id || member.userId || '') === currentUserId);
  const isManager = Boolean(
    group &&
      (String(group.createUserId || '') === currentUserId ||
        members.some(
          (member) =>
            String((member.userId as LegacyEntity)?._id || member.userId || '') === currentUserId &&
            Number(member.roleType || 10) === 20
        ) ||
        Boolean(user?.roles?.admin))
  );

  const refreshGroup = async () => {
    if (!id) return;
    const result = await apiService.getGroupEntry(id);
    setGroup((result?.group || result) as LegacyEntity);
  };

  const handleJoin = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.joinGroup(id);
      await refreshGroup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!id || !currentUserId) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.leaveGroup(id, currentUserId);
      await refreshGroup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.updateGroup(id, {
        title: form.title,
        description: form.description,
        privacyType: Number(form.privacyType),
      });
      setEditing(false);
      await refreshGroup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading group..." />;
  }

  if (error || !group) {
    return <Alert type="danger">{error || 'Group not found'}</Alert>;
  }

  const privacyLabel = Number(group.privacyType || 10) === 10 ? 'Public' : Number(group.privacyType || 10) === 20 ? 'Closed' : 'Secret';

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Groups', url: '/groups' },
          { title: group.title, active: true },
        ]}
      />

      <GeoPatternBackground seed={group.title || 'group'} height={120} />

      <PageHeader
        title={group.title}
        subtitle={`${privacyLabel} group`}
        icon="users"
        iconColor="text-primary"
        actions={
          <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/members`} className="btn btn-default">
            <i className="fa fa-users"></i> View Members
          </Link>
        }
      />

      <GroupNavigation group={group} activeTab="about" />

      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          {!editing ? (
            <>
              <div className="row" style={{ marginBottom: 12 }}>
                <div className="col-sm-12">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts`} className="no-underline">
                    <div className="well stat" style={{ marginBottom: 10 }}>
                      <div className="stat-value">{totals.contributions}</div>
                      <div className="stat-label">Contributions</div>
                    </div>
                  </Link>
                </div>
              </div>
              <div className="row">
                <div className="col-sm-4">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts?tab=topics`} className="no-underline">
                    <div className="well stat">
                      <div className="stat-value">{totals.topics}</div>
                      <div className="stat-label">Topics</div>
                    </div>
                  </Link>
                </div>
                <div className="col-sm-4">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts?tab=arguments`} className="no-underline">
                    <div className="well stat">
                      <div className="stat-value">{totals.arguments}</div>
                      <div className="stat-label">Facts</div>
                    </div>
                  </Link>
                </div>
                <div className="col-sm-4">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts?tab=questions`} className="no-underline">
                    <div className="well stat">
                      <div className="stat-value">{totals.questions}</div>
                      <div className="stat-label">Questions</div>
                    </div>
                  </Link>
                </div>
              </div>
              <div className="row">
                <div className="col-sm-4">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts?tab=answers`} className="no-underline">
                    <div className="well stat">
                      <div className="stat-value">{totals.answers}</div>
                      <div className="stat-label">Answers</div>
                    </div>
                  </Link>
                </div>
                <div className="col-sm-4">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts?tab=artifacts`} className="no-underline">
                    <div className="well stat">
                      <div className="stat-value">{totals.artifacts}</div>
                      <div className="stat-label">Artifacts</div>
                    </div>
                  </Link>
                </div>
                <div className="col-sm-4">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts?tab=issues`} className="no-underline">
                    <div className="well stat">
                      <div className="stat-value">{totals.issues}</div>
                      <div className="stat-label">Issues</div>
                    </div>
                  </Link>
                </div>
              </div>
              <div className="row">
                <div className="col-sm-4">
                  <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts?tab=opinions`} className="no-underline">
                    <div className="well stat">
                      <div className="stat-value">{totals.opinions}</div>
                      <div className="stat-label">Comments</div>
                    </div>
                  </Link>
                </div>
              </div>

              <p>{group.description || 'No description provided.'}</p>
              <p className="text-muted">{members.length} member(s)</p>

              <div className="form-group">
                {currentUserId && !isMember && (
                  <Button type="button" variant="primary" onClick={handleJoin} disabled={busy} icon="sign-in">
                    Join Group
                  </Button>
                )}
                {currentUserId && isMember && (
                  <Button type="button" variant="default" onClick={handleLeave} disabled={busy} icon="sign-out">
                    Leave Group
                  </Button>
                )}
                {' '}
                {isManager && (
                  <Button type="button" variant="info" onClick={() => setEditing(true)} icon="pencil">
                    Edit Group
                  </Button>
                )}
                {' '}
                <Button type="button" variant="default" onClick={() => navigate('/groups')} icon="arrow-left">
                  Back to Groups
                </Button>
              </div>
            </>
          ) : (
            <>
              <Input
                name="title"
                label="Group name"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <TextArea
                name="description"
                label="Description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={6}
              />
              <Select
                name="privacyType"
                label="Privacy"
                value={form.privacyType}
                onChange={(e) => setForm((prev) => ({ ...prev, privacyType: e.target.value }))}
                options={[
                  { value: '10', label: 'Public' },
                  { value: '20', label: 'Closed' },
                  { value: '30', label: 'Secret' },
                ]}
              />

              <div className="form-group" style={{ marginTop: '20px' }}>
                <Button type="button" variant="primary" onClick={handleSave} disabled={busy} icon="check">
                  Save Changes
                </Button>{' '}
                <Button type="button" variant="default" onClick={() => setEditing(false)} disabled={busy} icon="times">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupPage;
