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

const QuestionEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [references, setReferences] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Question ID is required');
        setLoading(false);
        return;
      }

      try {
        const result = await apiService.getQuestionEntry(id);
        const question = result?.question;
        if (!question) {
          setError('Question not found');
          return;
        }
        setTitle(question.title || '');
        setDescription(question.content || question.description || '');
        setTopicId(String(question.ownerId || ''));
        setReferences(question.references || '');
        setIsPrivate(Boolean(question.private));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load question');
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
      await apiService.updateQuestion(id, {
        title,
        description,
        topicId: topicId || undefined,
        references,
        private: isPrivate,
      });
      navigate('/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading question..." />;
  }

  return (
    <div>
      <PageMeta title="Edit Question" description={`Editing: ${title}`} />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Questions', url: '/questions' }, { title: 'Edit Question', active: true }]} />
      <PageHeader title="Edit Question" icon="question-circle" iconColor="text-success" />
      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <Input name="title" label="Question title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <RichTextEditor name="description" label="Question details" value={description} onChange={(_, html) => setDescription(html)} />
            <Input name="topicId" label="Topic ID (optional)" value={topicId} onChange={(e) => setTopicId(e.target.value)} />
            <TextArea name="references" label="References (optional)" value={references} onChange={(e) => setReferences(e.target.value)} rows={3} />
            <Checkbox name="private" label="Private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button type="submit" variant="success" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditPage;
