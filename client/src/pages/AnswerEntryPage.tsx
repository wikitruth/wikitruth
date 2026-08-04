import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/common/Alert';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import EntryList from '../components/common/EntryList';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import type { LegacyEntity } from '../types/legacy';
import type { AnswerEntryResponse } from '../types/api';
import type { Issue, Opinion } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import {
  EntryContextLine,
  EntryMetaBlock,
  buildLegacyEntryBreadcrumb,
} from '../components/Entry/EntryLegacyParity';
import TruthSummaryPanel from '../components/Entry/TruthSummaryPanel';
import EntryVerdictStatus from '../components/Entry/EntryVerdictStatus';

const AnswerEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [data, setData] = useState<AnswerEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnswerEntry = async () => {
      if (!id) {
        setError('Answer ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = await apiService.getAnswerEntry(id);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load answer');
      } finally {
        setLoading(false);
      }
    };

    fetchAnswerEntry();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading answer..." />;
  }

  if (error || !data?.answer) {
    return <Alert type="danger">{error || 'Answer not found'}</Alert>;
  }

  const answer = data.answer as LegacyEntity;
  const isDiscussion = location.pathname.endsWith('/discussion');
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];
  const detailsTab = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/answers/entry/${encodeURIComponent(String(answer._id || ''))}`,
    },
    {
      id: 'issues',
      title: 'Issues',
      icon: 'exclamation-circle',
      url: `/issues?answer=${encodeURIComponent(String(answer._id || ''))}`,
      count: Number(answer.childrenCount?.issues?.accepted || 0),
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: 'comments-o',
      url: `/answers/entry/${encodeURIComponent(String(answer._id || ''))}/discussion`,
      count: Number(answer.childrenCount?.opinions?.accepted || 0),
    },
  ].filter((tab) => tab.id === 'details' || tab.id === 'comments' || Number(tab.count || 0) > 0);
  const breadcrumbItems = buildLegacyEntryBreadcrumb(answer, 'answer', {
    sectionTopic: (data.topic || answer.parentTopic || null) as LegacyEntity | null,
    grandParentTopic: (data.parentTopic || data.grandParentTopic || null) as LegacyEntity | null,
    parentArgument: (answer.parentArgument || null) as LegacyEntity | null,
    parentQuestion: (answer.parentQuestion || null) as LegacyEntity | null,
  });

  return (
    <div>
      <PageMeta title={answer.title} description={answer.description || answer.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={answer.title || 'answer'} height={100} />
      <PageHeader
        title={answer.title}
        icon="list-alt"
        iconColor="text-primary"
      />
      <EntryContextLine entry={answer} objectName="answer" />
      <div className="wt-entry-labels">
        <EntryVerdictStatus entry={answer} />
      </div>

      <TruthSummaryPanel objectName="answer" objectId={String(answer._id || '')} />

      <EntryQuickActions
        entry={answer}
        objectName="answer"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={answer} editPath={`/answers/edit/${encodeURIComponent(answer._id)}`} />}
      />
      <PageTabs tabs={detailsTab} activeTab={isDiscussion ? 'comments' : 'details'} />

      {!isDiscussion ? (
        <div className="text-body" style={{ marginTop: '20px' }}>
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.content || answer.description || '') }} />
        </div>
      ) : null}
      {!isDiscussion && issues.length > 0 && (
        <EntryList
          title="Issues"
          icon="exclamation-triangle"
          iconColor="text-warning"
          count={answer.childrenCount?.issues?.accepted ?? issues.length}
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
          count={answer.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      {isDiscussion && opinions.length === 0 ? (
        <Alert type="info">
          No comments yet.{' '}
          <Link to={`/opinions/create?parentId=${encodeURIComponent(answer._id)}&parentType=answer`}>
            Start the discussion
          </Link>
          .
        </Alert>
      ) : null}

      <EntryMetaBlock entry={answer} />

      <Link to="/answers" className="btn btn-default" style={{ marginTop: '20px' }}>
        <i className="fa fa-arrow-left"></i> Back to Answers
      </Link>
    </div>
  );
};

export default AnswerEntryPage;
