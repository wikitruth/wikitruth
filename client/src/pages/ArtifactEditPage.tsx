import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import Checkbox from '../components/Form/Checkbox';
import Select from '../components/Form/Select';
import NumericTagCheckboxes from '../components/Form/NumericTagCheckboxes';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import { FACT_TAG_OPTIONS, FACT_TYPE_OPTIONS } from '../constants/entryFormOptions';
import { readArtifactFile } from '../utils/artifactUpload';
import ArtifactProvenanceFields from '../components/Artifacts/ArtifactProvenanceFields';
import {
  EMPTY_ARTIFACT_PROVENANCE,
  type ArtifactProvenanceInput,
} from '../constants/artifactOptions';

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
  const [parentId, setParentId] = useState('');
  const [typeId, setTypeId] = useState('1');
  const [tags, setTags] = useState('');
  const [inlineFile, setInlineFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState('');
  const [provenance, setProvenance] = useState<ArtifactProvenanceInput>({ ...EMPTY_ARTIFACT_PROVENANCE });

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Artifact ID is required');
        setLoading(false);
        return;
      }

      try {
        const result = await apiService.getArtifactEntry(id);
        const artifact = result?.artifact;
        setTitle(artifact?.title || '');
        setDescription(artifact?.content || artifact?.description || '');
        setTopicId(String(artifact?.ownerId || ''));
        setSource(artifact?.source || '');
        setIsPrivate(Boolean(artifact?.private));
        setParentId(String(artifact?.parentId || ''));
        setTypeId(String(artifact?.typeId ?? 1));
        setTags(Array.isArray(artifact?.tags) ? artifact.tags.join(',') : '');
        setExistingFileName(String(artifact?.file?.name || ''));
        setProvenance({
          artifactType: String(artifact?.artifactType || 'other'),
          originType: String(artifact?.provenance?.originType || 'unknown'),
          sourceCreator: String(artifact?.provenance?.creator || ''),
          publisher: String(artifact?.provenance?.publisher || ''),
          publicationDate: artifact?.provenance?.publicationDate ? new Date(artifact.provenance.publicationDate).toISOString().slice(0, 10) : '',
          captureDate: artifact?.provenance?.captureDate ? new Date(artifact.provenance.captureDate).toISOString().slice(0, 16) : '',
          archiveUrl: String(artifact?.provenance?.archiveUrl || ''),
          checksum: String(artifact?.provenance?.checksum || ''),
          accessLimitations: String(artifact?.provenance?.accessLimitations || ''),
          verifiabilityNotes: String(artifact?.provenance?.verifiabilityNotes || ''),
        });
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
      const file = inlineFile ? await readArtifactFile(inlineFile) : undefined;
      const response = await apiService.updateArtifact(id, {
        title,
        description,
        topicId,
        source,
        private: isPrivate,
        parentId,
        typeId: Number(typeId),
        tags,
        file,
        ...provenance,
      });
      const artifact = response?.artifact;
      if (artifact?._id) {
        navigate(`/artifacts/entry/${encodeURIComponent(String(artifact.friendlyUrl || artifact._id))}/${encodeURIComponent(String(artifact._id))}`);
      } else {
        navigate('/artifacts');
      }
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
      <PageMeta title="Edit Artifact" description={`Editing: ${title}`} />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Artifacts', url: '/artifacts' }, { title: 'Edit Artifact', active: true }]} />
      <PageHeader title="Edit Artifact" icon="picture-o" iconColor="text-primary" />
      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <Input name="title" label="Artifact title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <RichTextEditor name="description" label="Description" value={description} onChange={(_, html) => setDescription(html)} />
            <Input name="source" label="Source URL (optional)" value={source} onChange={(e) => setSource(e.target.value)} />
            <ArtifactProvenanceFields value={provenance} onChange={setProvenance} disabled={saving} />
            <Input name="topicId" label="Topic ID (optional)" value={topicId} onChange={(e) => setTopicId(e.target.value)} />
            <div className="form-group">
              <label htmlFor="inlineFile">Replace inline file (optional)</label>
              {existingFileName ? <p className="help-block">Current file: {existingFileName}</p> : null}
              <input
                id="inlineFile"
                name="inlineFile"
                type="file"
                className="form-control"
                onChange={(event) => setInlineFile(event.target.files?.[0] || null)}
              />
              <p className="help-block">Maximum file size: 10 MB.</p>
            </div>
            <Select name="typeId" label="Legacy evidence classification" value={typeId} onChange={(e) => setTypeId(e.target.value)} options={FACT_TYPE_OPTIONS} />
            <Input name="parentId" label="Parent artifact ID (optional)" value={parentId} onChange={(e) => setParentId(e.target.value)} />
            <NumericTagCheckboxes name="artifactTags" value={tags} options={FACT_TAG_OPTIONS} onChange={setTags} />
            <Checkbox name="private" label="Private" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button type="submit" variant="primary" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
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

export default ArtifactEditPage;
