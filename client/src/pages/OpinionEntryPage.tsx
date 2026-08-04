import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import EntryList from '../components/common/EntryList';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import type { OpinionEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Issue, Opinion } from '../types';
import { CommentRevisionNotice } from '../components/Entry/DiscussionIntegrityPanels';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import {
  EntryContextLine,
  EntryMetaBlock,
  buildLegacyEntryBreadcrumb,
} from '../components/Entry/EntryLegacyParity';
import OpinionClassificationLabel from '../components/Entry/OpinionClassificationLabel';

const OpinionEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OpinionEntryResponse | null>(null);
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
        const result = await apiService.getOpinionEntry(id);
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
  const typedOpinion = opinion as unknown as Opinion;
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];
  
  // Build breadcrumb items
  const breadcrumbItems = buildLegacyEntryBreadcrumb(opinion, 'opinion', {
    sectionTopic: (data.topic || opinion.parentTopic || null) as LegacyEntity | null,
    grandParentTopic: (data.parentTopic || data.grandParentTopic || null) as LegacyEntity | null,
    parentArgument: (opinion.parentArgument || null) as LegacyEntity | null,
    parentQuestion: (opinion.parentQuestion || null) as LegacyEntity | null,
    parentIssue: (opinion.parentIssue || null) as LegacyEntity | null,
  });

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/opinions/entry/${encodeURIComponent(String(opinion.friendlyUrl || opinion._id))}/${encodeURIComponent(String(opinion._id))}`,
    },
  ];

  return (
    <div>
      <PageMeta title={opinion.title} description={opinion.description || opinion.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={opinion.title || 'opinion'} height={100} />
      
      <PageHeader 
        title={opinion.title}
        subtitle={opinion.subtitle}
        icon="comment"
        iconColor="text-info"
      />
      <EntryContextLine entry={opinion} objectName="opinion" />
      <p style={{ marginTop: 8 }}>
        <OpinionClassificationLabel value={(opinion.extras as { classification?: unknown } | undefined)?.classification} />
      </p>

      <EntryQuickActions
        entry={opinion}
        objectName="opinion"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={opinion} editPath={`/opinions/edit/${encodeURIComponent(opinion._id)}`} />}
      />
      
      <PageTabs tabs={tabs} activeTab="details" />
      <CommentRevisionNotice opinion={typedOpinion} />

      {/* Opinion content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {opinion.content ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(opinion.content) }} />
        ) : opinion.contentPreview ? (
          <p className="lead">{opinion.contentPreview}</p>
        ) : opinion.description && (
          <p className="lead">{opinion.description}</p>
        )}
      </div>
      {issues.length > 0 && (
        <EntryList
          title="Issues"
          icon="exclamation-triangle"
          iconColor="text-warning"
          count={opinion.childrenCount?.issues?.accepted ?? issues.length}
        >
          {issues.map((issue) => (
            <IssueEntryRow key={issue._id} issue={issue as unknown as Issue} subtitle={false} />
          ))}
        </EntryList>
      )}

      {opinions.length > 0 && (
        <EntryList
          title="Comments"
          icon="comment"
          iconColor="text-info"
          count={opinion.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((comment) => (
            <OpinionEntryRow key={comment._id} opinion={comment as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      <EntryMetaBlock entry={opinion} />

      <div style={{ marginTop: '30px' }}>
        <Link to="/opinions" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Opinions
        </Link>
      </div>
    </div>
  );
};

export default OpinionEntryPage;
