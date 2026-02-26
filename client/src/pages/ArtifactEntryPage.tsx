import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/common/Alert';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import apiService from '../services/api';
import type { LegacyEntity } from '../types/legacy';

const ArtifactEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [artifact, setArtifact] = useState<LegacyEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtifact = async () => {
      if (!id) {
        setError('Artifact ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = await apiService.getArtifactEntry(id);
        setArtifact(result?.artifact || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artifact');
      } finally {
        setLoading(false);
      }
    };

    fetchArtifact();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading artifact..." />;
  }

  if (error || !artifact) {
    return <Alert type="danger">{error || 'Artifact not found'}</Alert>;
  }

  return (
    <div>
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Artifacts', url: '/artifacts' }, { title: artifact.title, active: true }]} />
      <PageHeader
        title={artifact.title}
        icon="picture-o"
        iconColor="text-primary"
        actions={
          <Link to={`/artifacts/edit/${artifact._id}`} className="btn btn-default">
            <i className="fa fa-pencil"></i> Edit
          </Link>
        }
      />

      <div className="text-body" style={{ marginTop: '20px' }}>
        <div dangerouslySetInnerHTML={{ __html: artifact.content || artifact.description || '' }} />
      </div>

      {artifact.source && (
        <p style={{ marginTop: '16px' }}>
          <strong>Source:</strong>{' '}
          <a href={artifact.source} target="_blank" rel="noopener noreferrer">
            {artifact.source}
          </a>
        </p>
      )}

      <Link to="/artifacts" className="btn btn-default" style={{ marginTop: '20px' }}>
        <i className="fa fa-arrow-left"></i> Back to Artifacts
      </Link>
    </div>
  );
};

export default ArtifactEntryPage;
