import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import apiService from '../services/api';
import type { LegacyEntity, LegacyResponse } from '../types/legacy';

const OpinionEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<LegacyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError('No opinion ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = (await apiService.getOpinionEntry(id)) as LegacyResponse;
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load opinion');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading opinion..." />;
  }

  if (error || !data?.opinion) {
    return <Alert type="danger">Error loading opinion: {error || 'Opinion not found'}</Alert>;
  }

  const opinion = data.opinion as LegacyEntity;
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Opinions', url: '/opinions' },
    { title: opinion.title, active: true }
  ];

  // Build tabs
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/opinions/entry/${opinion.friendlyUrl}/${opinion._id}` },
    { id: 'discussion', title: 'Discussion', url: `/opinions/entry/${opinion.friendlyUrl}/${opinion._id}/discussion`, count: 0 }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader 
        title={opinion.title}
        subtitle={opinion.subtitle}
        icon="comment"
        iconColor="text-info"
        actions={
          <Link to={`/opinions/edit/${opinion._id}`} className="btn btn-default">
            <i className="fa fa-pencil"></i> Edit
          </Link>
        }
      />
      
      <PageTabs tabs={tabs} />

      {/* Opinion content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {opinion.content ? (
          <div dangerouslySetInnerHTML={{ __html: opinion.content }} />
        ) : opinion.contentPreview ? (
          <p className="lead">{opinion.contentPreview}</p>
        ) : opinion.description && (
          <p className="lead">{opinion.description}</p>
        )}
      </div>

      {/* Footer meta information */}
      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {opinion.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Authored by: <strong>{opinion.editorUsername}</strong>
          </p>
        )}
        {opinion.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(opinion.editDate).toLocaleDateString()}
          </p>
        )}
        {opinion.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/opinions" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Opinions
        </Link>
      </div>
    </div>
  );
};

export default OpinionEntryPage;
