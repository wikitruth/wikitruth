import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import Select from '../components/Form/Select';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';

const IssueEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [issueType, setIssueType] = useState('100');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Issue ID is required');
        setLoading(false);
        return;
      }

      try {
        const result = await apiService.getIssueEntry(id);
        const issue = result?.issue;
        setTitle(issue?.title || '');
        setDescription(issue?.content || issue?.description || '');
        setTopicId(String(issue?.ownerId || ''));
        setIssueType(String(issue?.issueType || 100));
        setIsPrivate(Boolean(issue?.private));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load issue');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    if (title.trim().length < 3 || description.trim().length < 10) {
      setError('Title must be at least 3 characters and description at least 10 characters');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await apiService.updateIssue(id, {
        title,
        description,
        topicId: topicId || undefined,
        issueType: Number(issueType),
        private: isPrivate,
      });
      navigate('/issues');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading issue..." />;
  }

  return (
    <div>
      <PageMeta title="Edit Issue" description={`Editing: ${title}`} />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Issues', url: '/issues' }, { title: 'Edit Issue', active: true }]} />
      <PageHeader title="Edit Issue" icon="exclamation-triangle" iconColor="text-warning" />
      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <Input name="title" label="Issue title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <RichTextEditor name="description" label="Issue details" value={description} onChange={(_, html) => setDescription(html)} />
            <Select
              name="issueType"
              label="Issue type"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              options={[
                { value: '10', label: 'Logical fallacy (critical)' },
                { value: '20', label: 'Biased or flawed reasoning (critical)' },
                { value: '30', label: 'Terminology issue (critical)' },
                { value: '40', label: 'Unwelcome content (critical)' },
                { value: '45', label: 'Other issue (critical)' },
                { value: '50', label: 'Incoherent or unrelated' },
                { value: '60', label: 'Too broad or multiple topics' },
                { value: '70', label: 'Unsubstantiated claim' },
                { value: '100', label: 'Other issue (warning)' },
              ]}
            />
            <Input name="topicId" label="Topic ID (optional)" value={topicId} onChange={(e) => setTopicId(e.target.value)} />
            <Checkbox name="private" label="Private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button type="submit" variant="warning" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IssueEditPage;
