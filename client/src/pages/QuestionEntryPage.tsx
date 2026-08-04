import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import type { QuestionEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import EntryList from '../components/common/EntryList';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import type { Answer, Issue, Opinion } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import {
  EntryContextLine,
  EntryMetaBlock,
  buildLegacyEntryBreadcrumb,
} from '../components/Entry/EntryLegacyParity';

const QuestionEntryPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<QuestionEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionEntry = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const result = await apiService.getQuestionEntry(id);
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching question entry:', err);
      setError('Failed to load question');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchQuestionEntry();
  }, [fetchQuestionEntry]);

  if (loading) {
    return <LoadingSpinner message="Loading question..." />;
  }

  if (error || !data?.question) {
    return <Alert type="danger">{error || 'Question not found'}</Alert>;
  }

  const question = data.question as LegacyEntity;
  const answers = (data.answers || []) as LegacyEntity[];
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];
  
  // Build breadcrumb items
  const breadcrumbItems = buildLegacyEntryBreadcrumb(question, 'question', {
    sectionTopic: (data.topic || question.parentTopic || null) as LegacyEntity | null,
    grandParentTopic: (data.parentTopic || data.grandParentTopic || null) as LegacyEntity | null,
    parentArgument: (question.parentArgument || null) as LegacyEntity | null,
  });

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/questions/entry/${encodeURIComponent(String(question.friendlyUrl || question._id))}/${encodeURIComponent(String(question._id))}`,
    },
    {
      id: 'answers',
      title: 'Answers',
      icon: 'check-circle-o',
      url: `/answers?question=${encodeURIComponent(String(question._id || ''))}`,
      count: Number(question.childrenCount?.answers?.accepted || 0),
    },
    {
      id: 'issues',
      title: 'Issues',
      icon: 'exclamation-circle',
      url: `/issues?question=${encodeURIComponent(String(question._id || ''))}`,
      count: Number(question.childrenCount?.issues?.accepted || 0),
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: 'comments-o',
      url: `/opinions?question=${encodeURIComponent(String(question._id || ''))}`,
      count: Number(question.childrenCount?.opinions?.accepted || 0),
    },
  ].filter((tab) => tab.id === 'details' || Number(tab.count || 0) > 0);

  return (
    <div>
      <PageMeta title={question.title} description={question.description || question.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={question.title || 'question'} height={100} />
      
      <PageHeader 
        title={question.title}
        subtitle={question.subtitle}
        icon="question-circle"
        iconColor="text-success-x"
      />
      <EntryContextLine entry={question} objectName="question" />

      <EntryQuickActions
        entry={question}
        objectName="question"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={question} editPath={`/questions/edit/${encodeURIComponent(question._id)}`} />}
      />
      
      <PageTabs tabs={tabs} activeTab="details" />

      {/* Question content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {question.content ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.content) }} />
        ) : question.description && (
          <p className="lead">{question.description}</p>
        )}
      </div>
      {answers.length > 0 && (
        <EntryList
          title="Answers"
          icon="check-circle-o"
          iconColor="text-success-x"
          count={question.childrenCount?.answers?.accepted ?? answers.length}
        >
          {answers.map((answer) => (
            <AnswerEntryRow key={answer._id} answer={answer as unknown as Answer} subtitle={false} />
          ))}
        </EntryList>
      )}

      {issues.length > 0 && (
        <EntryList
          title="Issues"
          icon="exclamation-triangle"
          iconColor="text-warning"
          count={question.childrenCount?.issues?.accepted ?? issues.length}
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
          count={question.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      <EntryMetaBlock entry={question} />

      <div style={{ marginTop: '30px' }}>
        <Link to="/questions" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Questions
        </Link>
      </div>
    </div>
  );
};

export default QuestionEntryPage;
