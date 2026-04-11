import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import EntryList from '../components/common/EntryList';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import type { IssueEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Opinion } from '../types';
import { formatRelativeTime } from '../utils/dateFormat';
import { sanitizeHtml } from '../utils/sanitizeHtml';

const IssueEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<IssueEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError('No issue ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.getIssueEntry(id);
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load issue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading issue..." />;
  }

  if (error || !data?.issue) {
    return <Alert type="danger">Error loading issue: {error || 'Issue not found'}</Alert>;
  }

  const issue = data.issue as LegacyEntity;
  const opinions = (data.opinions || []) as LegacyEntity[];
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Issues', url: '/issues' },
    { title: issue.title, active: true }
  ];

  // Build tabs
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/issues/entry/${issue.friendlyUrl}/${issue._id}` },
    {
      id: 'discussion',
      title: 'Discussion',
      url: `/issues/entry/${issue.friendlyUrl}/${issue._id}/discussion`,
      count: issue.childrenCount?.opinions?.accepted ?? opinions.length,
    }
  ];

  return (
    <div>
      <PageMeta title={issue.title} description={issue.description || issue.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={issue.title || 'issue'} height={100} />
      
      <PageHeader 
        title={issue.title}
        subtitle={issue.subtitle}
        icon="exclamation-triangle"
        iconColor="text-warning"
        actions={<EntryActionsMenu entry={issue} editPath={`/issues/edit/${encodeURIComponent(issue._id)}`} />}
      />
      
      <PageTabs tabs={tabs} />

      {/* Issue content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {issue.content ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(issue.content) }} />
        ) : issue.contentPreview ? (
          <p className="lead">{issue.contentPreview}</p>
        ) : issue.description && (
          <p className="lead">{issue.description}</p>
        )}
      </div>

      {opinions.length > 0 && (
        <EntryList
          title="Comments"
          icon="comment"
          iconColor="text-info"
          count={issue.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      {/* Footer meta information */}
      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {issue.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Reported by: <strong>{issue.editorUsername}</strong>
          </p>
        )}
        {issue.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {formatRelativeTime(issue.editDate)}
          </p>
        )}
        {issue.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/issues" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Issues
        </Link>
      </div>
    </div>
  );
};

export default IssueEntryPage;
