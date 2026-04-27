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
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import type { IssueEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Opinion } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import { EntryContextLine, EntryMetaBlock, EntryRelatedTopics } from '../components/Entry/EntryLegacyParity';

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
  const breadcrumbItems: Array<{ title: string; url?: string; active?: boolean }> = [
    { title: 'Home', url: '/' },
    { title: 'Issues', url: '/issues' },
  ];
  if (issue.parentTopic?._id) {
    breadcrumbItems.push({
      title: String(issue.parentTopic.title || 'Topic'),
      url: `/topics/entry/${encodeURIComponent(String(issue.parentTopic.friendlyUrl || issue.parentTopic._id))}/${encodeURIComponent(String(issue.parentTopic._id))}`,
    });
  }
  breadcrumbItems.push({ title: issue.title, active: true });

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/issues/entry/${encodeURIComponent(String(issue.friendlyUrl || issue._id))}/${encodeURIComponent(String(issue._id))}`,
    },
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
      />
      <EntryContextLine entry={issue} objectName="issue" />

      <EntryQuickActions
        entry={issue}
        objectName="issue"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={issue} editPath={`/issues/edit/${encodeURIComponent(issue._id)}`} />}
      />
      
      <PageTabs tabs={tabs} activeTab="details" />

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
      <EntryRelatedTopics entry={issue} />

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

      <EntryMetaBlock entry={issue} />

      <div style={{ marginTop: '30px' }}>
        <Link to="/issues" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Issues
        </Link>
      </div>
    </div>
  );
};

export default IssueEntryPage;
