import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import type { LegacyEntity, LegacyResponse } from '../types/legacy';

const ArtifactsPage: React.FC = () => {
  const [data, setData] = useState<LegacyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiService.getArtifacts();
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load artifacts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading artifacts..." />;
  }

  if (error) {
    return <div className="alert alert-danger">Error loading artifacts: {error}</div>;
  }

  return (
    <div>
      <h1 className="page-header wt-header">
        <i className="fa fa-puzzle-piece"></i> Latest Artifacts
      </h1>
      <p>
        <Link to="/artifacts/create" className="btn btn-primary">
          <i className="fa fa-plus"></i> Add Artifact
        </Link>
      </p>

      <ul className="list-group wt-list">
        <li className="list-group-item highlight">
          <i className="fa fa-puzzle-piece text-muted" aria-hidden="true"></i>
          <div>Latest Artifacts</div>
        </li>
        {data?.artifacts && data.artifacts.length > 0 ? (
          data.artifacts.map((artifact: LegacyEntity) => (
            <li key={artifact._id} className="list-group-item">
              <h4>
                <Link to={`/artifacts/entry/${artifact.friendlyUrl}/${artifact._id}`}>
                  {artifact.title}
                </Link>
              </h4>
              {artifact.contentPreview && (
                <p className="text-muted">{artifact.contentPreview}</p>
              )}
              {artifact.file && (
                <div className="text-muted">
                  <small>
                    <span className="glyphicon glyphicon-file"></span> {artifact.file.type} - {artifact.file.name}
                  </small>
                </div>
              )}
              <small className="text-muted">
                Edited by {artifact.editorUsername} on {new Date(artifact.editDate).toLocaleDateString()}
              </small>
            </li>
          ))
        ) : (
          <li className="list-group-item">No artifacts found.</li>
        )}
      </ul>
    </div>
  );
};

export default ArtifactsPage;
