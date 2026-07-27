import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import { normalizeOpinionClassification, type OpinionClassification } from '../components/Entry/OpinionClassificationLabel';

const OpinionEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [classification, setClassification] = useState<OpinionClassification>('general');

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Opinion ID is required');
        setLoading(false);
        return;
      }

      try {
        const result = await apiService.getOpinionEntry(id);
        const opinion = result?.opinion;
        setTitle(opinion?.title || '');
        setDescription(opinion?.content || opinion?.description || '');
        setTopicId(String(opinion?.ownerId || ''));
        setIsPrivate(Boolean(opinion?.private));
        setClassification(normalizeOpinionClassification((opinion?.extras as { classification?: unknown } | undefined)?.classification));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load opinion');
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
      const response = await apiService.updateOpinion(id, {
        title,
        description,
        topicId,
        private: isPrivate,
        classification,
      });
      const opinion = response?.opinion;
      navigate(opinion?._id
        ? `/opinions/entry/${encodeURIComponent(String(opinion.friendlyUrl || opinion._id))}/${encodeURIComponent(String(opinion._id))}`
        : '/opinions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update opinion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading opinion..." />;
  }

  return (
    <div>
      <PageMeta title="Edit Opinion" description={`Editing: ${title}`} />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Opinions', url: '/opinions' }, { title: 'Edit Opinion', active: true }]} />
      <PageHeader title="Edit Opinion" icon="comment" iconColor="text-info" />
      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <Input name="title" label="Opinion title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <RichTextEditor name="description" label="Opinion details" value={description} onChange={(_, html) => setDescription(html)} />
            <Input name="topicId" label="Topic ID (optional)" value={topicId} onChange={(e) => setTopicId(e.target.value)} />
            <div className="form-group">
              <label htmlFor="opinion-classification">Contribution purpose</label>
              <select id="opinion-classification" className="form-control" value={classification} onChange={(event) => setClassification(event.target.value as OpinionClassification)}>
                <option value="general">General comment</option>
                <option value="supplement">Supplement</option>
                <option value="objection">Objection</option>
                <option value="question">Clarifying question</option>
              </select>
            </div>
            <Checkbox name="private" label="Private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button type="submit" variant="info" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>{' '}
              <Button type="button" variant="default" disabled={saving} icon="times" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OpinionEditPage;
