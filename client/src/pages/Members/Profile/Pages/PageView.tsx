import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import Input from '../../../../components/Form/Input';
import TextArea from '../../../../components/Form/TextArea';
import Button from '../../../../components/common/Button';
import Alert from '../../../../components/common/Alert';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import ProfileShell from '../../../../components/Members/ProfileShell';
import apiService from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';
import type { LegacyEntity } from '../../../../types/legacy';
import { sanitizeHtml } from '../../../../utils/sanitizeHtml';

const PageView: React.FC = () => {
  const { username: routeUsername, id } = useParams<{ username?: string; id: string }>();
  const { user } = useAuth();
  const username = routeUsername || user?.username || '';
  const [page, setPage] = useState<LegacyEntity | null>(null);
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
        const result = await apiService.getMemberPage(username, id);
        const pageModel = result?.page as LegacyEntity | undefined;
        setPage(pageModel || null);
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
      const result = await apiService.updateMemberPage(username, id, { title, content });
      setPage((result?.page as LegacyEntity | undefined) || page);
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

  const pageContent = (
    <div>
      <h1 className="page-header wt-header">
        <i className="fa fa-file-text-o"></i> {page.title}{' '}
        {isOwnProfile && (
          <Button type="button" variant="default" onClick={() => setEditing((prev) => !prev)} icon="pencil" className="btn-sm">
            {editing ? 'Cancel Edit' : 'Edit'}
          </Button>
        )}
      </h1>

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
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }} />
            </div>
          )}
        </div>
      </div>

      <Link to={isOwnProfile ? '/members/profile/pages' : `/members/${username}`} className="btn btn-default" onClick={(e) => { if (!username) e.preventDefault(); }}>
        <i className="fa fa-arrow-left"></i> Back
      </Link>
    </div>
  );

  if (isOwnProfile) {
    return (
      <ProfileShell username={username} activeTab="pages" isOwnProfile={true}>
        {pageContent}
      </ProfileShell>
    );
  }

  return pageContent;
};

export default PageView;
