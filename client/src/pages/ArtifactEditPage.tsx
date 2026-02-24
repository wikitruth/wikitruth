import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import TextArea from '../components/Form/TextArea';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import type { LegacyResponse } from '../types/legacy';

const ArtifactEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [source, setSource] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Artifact ID is required');
        setLoading(false);
        return;
      }

      try {
        const result = (await apiService.getArtifactEntry(id)) as LegacyResponse;
        const artifact = result?.artifact;
        setTitle(artifact?.title || '');
        setDescription(artifact?.content || artifact?.description || '');
        setTopicId(String(artifact?.ownerId || ''));
        setSource(artifact?.source || '');
        setIsPrivate(Boolean(artifact?.private));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artifact');
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
      await apiService.updateArtifact(id, {
        title,
        description,
        topicId: topicId || undefined,
        source,
        private: isPrivate,
      });
      navigate('/artifacts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update artifact');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading artifact..." />;
  }

  return (
    <div>
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Artifacts', url: '/artifacts' }, { title: 'Edit Artifact', active: true }]} />
      <PageHeader title="Edit Artifact" icon="picture-o" iconColor="text-primary" />
      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <Input name="title" label="Artifact title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <TextArea name="description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} required />
            <Input name="source" label="Source URL (optional)" value={source} onChange={(e) => setSource(e.target.value)} />
            <Input name="topicId" label="Topic ID (optional)" value={topicId} onChange={(e) => setTopicId(e.target.value)} />
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

export default ArtifactEditPage;
