import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ArtifactEntryRow from '../components/EntryRow/ArtifactEntryRow';
import apiService from '../services/api';
import type { Artifact } from '../types';
import type { LegacyEntity, LegacyResponse } from '../types/legacy';
import ContentViewFilter, { type ViewMode } from '../components/common/ContentViewFilter';
import { ContentVisibilityScope } from '../context/ContentVisibilityContext';
import { usePageContentVisibility } from '../hooks/usePageContentVisibility';

const ArtifactsPage: React.FC = () => {
  const [data, setData] = useState<LegacyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { override: viewMode, effectiveView, defaultLabel, setOverride } = usePageContentVisibility();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiService.getArtifacts(undefined, effectiveView);
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load artifacts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [effectiveView]);

  if (loading) {
    return <LoadingSpinner message="Loading artifacts..." />;
  }

  if (error) {
    return <div className="alert alert-danger">Error loading artifacts: {error}</div>;
  }

  return (
    <ContentVisibilityScope view={effectiveView}><div>
      <h1 className="page-header wt-header">
        <i className="fa fa-puzzle-piece"></i> Latest Artifacts
      </h1>
      <p>
        <Link to="/artifacts/create" className="btn btn-primary">
          <i className="fa fa-plus"></i> Add Artifact
        </Link>
      </p>

      <div className="panel panel-default">
        <div className="panel-body">
          <ContentViewFilter value={viewMode as ViewMode} onChange={setOverride} defaultLabel={defaultLabel} />
        </div>
      </div>

      <ul className="list-group wt-list">
        <li className="list-group-item highlight">
          <i className="fa fa-puzzle-piece text-muted" aria-hidden="true"></i>
          <div>Latest Artifacts</div>
        </li>
        {data?.artifacts && data.artifacts.length > 0 ? (
          data.artifacts.map((artifact: LegacyEntity) => (
            <ArtifactEntryRow
              key={artifact._id}
              artifact={artifact as unknown as Artifact}
              subtitle={true}
            />
          ))
        ) : (
          <li className="list-group-item">No artifacts found.</li>
        )}
      </ul>
    </div></ContentVisibilityScope>
  );
};

export default ArtifactsPage;
