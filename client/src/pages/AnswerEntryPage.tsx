import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { EntryContextLine, EntryMetaBlock, EntryRelatedTopics } from '../components/Entry/EntryLegacyParity';

const AnswerEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];
  const detailsTab = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/answers/entry/${encodeURIComponent(String(answer.friendlyUrl || answer._id))}/${encodeURIComponent(String(answer._id))}`,
    },
  ];
  const breadcrumbItems: Array<{ title: string; url?: string; active?: boolean }> = [
    { title: 'Home', url: '/' },
    { title: 'Answers', url: '/answers' },
  ];
  if (answer.parentQuestion?._id) {
    breadcrumbItems.push({
      title: String(answer.parentQuestion.title || 'Question'),
      url: `/questions/entry/${encodeURIComponent(String(answer.parentQuestion.friendlyUrl || answer.parentQuestion._id))}/${encodeURIComponent(String(answer.parentQuestion._id))}`,
    });
  }
  breadcrumbItems.push({ title: answer.title, active: true });

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

      <EntryQuickActions
        entry={answer}
        objectName="answer"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={answer} editPath={`/answers/edit/${encodeURIComponent(answer._id)}`} />}
      />
      <PageTabs tabs={detailsTab} activeTab="details" />

      <div className="text-body" style={{ marginTop: '20px' }}>
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.content || answer.description || '') }} />
      </div>
      <EntryRelatedTopics entry={answer} />

      {issues.length > 0 && (
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

      <EntryMetaBlock entry={answer} />

      <Link to="/answers" className="btn btn-default" style={{ marginTop: '20px' }}>
        <i className="fa fa-arrow-left"></i> Back to Answers
      </Link>
    </div>
  );
};

export default AnswerEntryPage;
