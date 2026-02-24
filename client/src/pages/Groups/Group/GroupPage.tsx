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

const GroupPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
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
        const result: any = await apiService.getGroupEntry(id);
        const groupModel = result?.group || result;
        setGroup(groupModel);
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

  const currentUserId = String((user as any)?._id || (user as any)?.id || '');

  const members = Array.isArray(group?.members) ? group.members : [];
  const isMember = members.some((member: any) => String(member?.userId?._id || member?.userId || '') === currentUserId);
  const isManager = Boolean(
    group &&
      (String(group.createUserId || '') === currentUserId ||
        members.some(
          (member: any) =>
            String(member?.userId?._id || member?.userId || '') === currentUserId && Number(member?.roleType || 10) === 20
        ) ||
        Boolean((user as any)?.roles?.admin))
  );

  const refreshGroup = async () => {
    if (!id) return;
    const result: any = await apiService.getGroupEntry(id);
    setGroup(result?.group || result);
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

      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          {!editing ? (
            <>
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
