import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import type { ArgumentEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryList from '../components/common/EntryList';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import type { Issue, Opinion, Question } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import {
  EntryContextLine,
  EntryMetaBlock,
  EntryRelatedTopics,
  buildLegacyEntryBreadcrumb,
} from '../components/Entry/EntryLegacyParity';

const ArgumentEntryPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<ArgumentEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArgumentEntry();
  }, [id]);

  const fetchArgumentEntry = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const result = await apiService.getArgumentEntry(id);
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching argument entry:', err);
      setError('Failed to load argument');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading argument..." />;
  }

  if (error || !data?.argument) {
    return <Alert type="danger">{error || 'Argument not found'}</Alert>;
  }

  const argument = data.argument as LegacyEntity;
  const questions = (data.questions || []) as LegacyEntity[];
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];
  
  // Build breadcrumb items
  const breadcrumbItems = buildLegacyEntryBreadcrumb(argument, 'argument', {
    sectionTopic: (data.topic || argument.parentTopic || null) as LegacyEntity | null,
    grandParentTopic: (data.parentTopic || data.grandParentTopic || null) as LegacyEntity | null,
    parentArgument: (argument.parentArgument || null) as LegacyEntity | null,
  });

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/arguments/entry/${encodeURIComponent(String(argument.friendlyUrl || argument._id))}/${encodeURIComponent(String(argument._id))}`,
    },
    {
      id: 'facts',
      title: 'Facts',
      icon: 'flash',
      url: `/arguments?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.arguments?.accepted || 0),
    },
    {
      id: 'questions',
      title: 'Questions',
      icon: 'question-circle',
      url: `/questions?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.questions?.accepted || 0),
    },
    {
      id: 'issues',
      title: 'Issues',
      icon: 'exclamation-circle',
      url: `/issues?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.issues?.accepted || 0),
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: 'comments-o',
      url: `/opinions?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.opinions?.accepted || 0),
    },
  ].filter((tab) => tab.id === 'details' || Number(tab.count || 0) > 0);

  return (
    <div>
      <PageMeta title={argument.title} description={argument.description || argument.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={argument.title || 'argument'} height={100} />
      
      <PageHeader 
        title={argument.title}
        subtitle={argument.subtitle}
        icon="flash"
        iconColor="text-primary"
      />
      <EntryContextLine entry={argument} objectName="argument" />

      <EntryQuickActions
        entry={argument}
        objectName="argument"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={argument} editPath={`/arguments/create?id=${encodeURIComponent(argument._id)}`} />}
      />
      
      <PageTabs tabs={tabs} activeTab="details" />

      {/* Verdict Badge */}
      {argument.verdict?.result && (
        <div className="alert alert-sm" 
             style={{ 
               backgroundColor: argument.verdict.result === 'true' ? '#dff0d8' : 
                                argument.verdict.result === 'false' ? '#f2dede' : '#fcf8e3',
               border: 'none',
               display: 'inline-block',
               padding: '5px 10px',
               marginTop: '10px'
             }}>
          <strong>Verdict:</strong> {argument.verdict.result.toUpperCase()}
        </div>
      )}

      {/* Argument content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {argument.content ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(argument.content) }} />
        ) : argument.description && (
          <p className="lead">{argument.description}</p>
        )}
      </div>
      <EntryRelatedTopics entry={argument} topicLinks={data.topicLinks} />

      {questions.length > 0 && (
        <EntryList
          title="Questions"
          icon="question-circle"
          iconColor="text-success-x"
          count={argument.childrenCount?.questions?.accepted ?? questions.length}
        >
          {questions.map((question) => (
            <QuestionEntryRow key={question._id} question={question as unknown as Question} subtitle={false} />
          ))}
        </EntryList>
      )}

      {issues.length > 0 && (
        <EntryList
          title="Issues"
          icon="exclamation-triangle"
          iconColor="text-warning"
          count={argument.childrenCount?.issues?.accepted ?? issues.length}
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
          count={argument.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      <EntryMetaBlock entry={argument} />

      <div style={{ marginTop: '30px' }}>
        <Link to="/arguments" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Arguments
        </Link>
      </div>
    </div>
  );
};

export default ArgumentEntryPage;
