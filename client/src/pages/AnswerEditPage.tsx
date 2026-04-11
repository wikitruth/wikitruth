import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import TextArea from '../components/Form/TextArea';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';

const AnswerEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [references, setReferences] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Answer ID is required');
        setLoading(false);
        return;
      }

      try {
        const result = await apiService.getAnswerEntry(id);
        const answer = result?.answer;
        setTitle(answer?.title || '');
        setDescription(answer?.content || answer?.description || '');
        setQuestionId(String(answer?.questionId || ''));
        setReferences(answer?.references || '');
        setIsPrivate(Boolean(answer?.private));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load answer');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    if (title.trim().length < 3 || description.trim().length < 10 || !questionId.trim()) {
      setError('Title, description, and question ID are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await apiService.updateAnswer(id, {
        title,
        description,
        questionId,
        references,
        private: isPrivate,
      });
      navigate('/answers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update answer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading answer..." />;
  }

  return (
    <div>
      <PageMeta title="Edit Answer" description={`Editing: ${title}`} />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Answers', url: '/answers' }, { title: 'Edit Answer', active: true }]} />
      <PageHeader title="Edit Answer" icon="list-alt" iconColor="text-primary" />
      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <Input name="title" label="Answer title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <RichTextEditor name="description" label="Answer details" value={description} onChange={(_, html) => setDescription(html)} />
            <Input name="questionId" label="Question ID" value={questionId} onChange={(e) => setQuestionId(e.target.value)} required />
            <TextArea name="references" label="References (optional)" value={references} onChange={(e) => setReferences(e.target.value)} rows={3} />
            <Checkbox name="private" label="Private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button type="submit" variant="primary" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AnswerEditPage;
