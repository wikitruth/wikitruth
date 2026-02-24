import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../../components/common/Breadcrumb';
import PageHeader from '../../../../components/common/PageHeader';
import Input from '../../../../components/Form/Input';
import TextArea from '../../../../components/Form/TextArea';
import Button from '../../../../components/common/Button';
import Alert from '../../../../components/common/Alert';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import apiService from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';

const PageView: React.FC = () => {
  const navigate = useNavigate();
  const { username: routeUsername, id } = useParams<{ username?: string; id: string }>();
  const { user } = useAuth();
  const username = routeUsername || user?.username || '';
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const isOwnProfile = useMemo(() => {
    return Boolean(user?.username && username && user.username === username);
  }, [user?.username, username]);

  useEffect(() => {
    const fetchPage = async () => {
      if (!username || !id) {
        setError('Page route is invalid');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result: any = await apiService.getMemberPage(username, id);
        const pageModel = result?.page;
        setPage(pageModel);
        setTitle(pageModel?.title || '');
        setContent(pageModel?.content || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [username, id]);

  const handleSave = async () => {
    if (!username || !id) {
      return;
    }

    if (title.trim().length < 3 || content.trim().length < 10) {
      setError('Title must be at least 3 characters and content at least 10 characters');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result: any = await apiService.updateMemberPage(username, id, { title, content });
      setPage(result?.page || page);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update page');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile page..." />;
  }

  if (error || !page) {
    return <Alert type="danger">{error || 'Profile page not found'}</Alert>;
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Profile', url: isOwnProfile ? '/members/profile' : `/members/${username}` },
          { title: 'Pages', url: isOwnProfile ? '/members/profile/pages' : `/members/${username}` },
          { title: page.title, active: true },
        ]}
      />

      <PageHeader
        title={page.title}
        subtitle="Custom profile page"
        icon="file-text-o"
        iconColor="text-primary"
        actions={
          isOwnProfile ? (
            <Button type="button" variant="default" onClick={() => setEditing((prev) => !prev)} icon="pencil">
              {editing ? 'Cancel Edit' : 'Edit'}
            </Button>
          ) : undefined
        }
      />

      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          {editing ? (
            <>
              <Input name="title" label="Page title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <TextArea name="content" label="Page content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
              <div className="form-group" style={{ marginTop: '20px' }}>
                <Button type="button" variant="primary" onClick={handleSave} disabled={busy} icon="check">
                  Save
                </Button>
              </div>
            </>
          ) : (
            <div>
              <div dangerouslySetInnerHTML={{ __html: page.content }} />
            </div>
          )}
        </div>
      </div>

      <Link to={isOwnProfile ? '/members/profile/pages' : `/members/${username}`} className="btn btn-default" onClick={(e) => { if (!username) e.preventDefault(); }}>
        <i className="fa fa-arrow-left"></i> Back
      </Link>
    </div>
  );
};

export default PageView;
