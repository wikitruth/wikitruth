import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import type { ArgumentEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryList from '../components/common/EntryList';
import type { Issue, Opinion, Question } from '../types';

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
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Arguments', url: '/arguments' },
    { title: argument.title, active: true }
  ];

  // Build tabs
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/arguments/entry/${argument.friendlyUrl}/${argument._id}` },
    {
      id: 'discussion',
      title: 'Discussion',
      url: `/arguments/entry/${argument.friendlyUrl}/${argument._id}/discussion`,
      count: argument.childrenCount?.opinions?.accepted ?? opinions.length,
    }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader 
        title={argument.title}
        subtitle={argument.subtitle}
        icon="flash"
        iconColor="text-primary"
      />
      
      <PageTabs tabs={tabs} />

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
          <div dangerouslySetInnerHTML={{ __html: argument.content }} />
        ) : argument.description && (
          <p className="lead">{argument.description}</p>
        )}
      </div>

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

      {/* Footer meta information */}
      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {argument.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Edited by: <strong>{argument.editorUsername}</strong>
          </p>
        )}
        {argument.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(argument.editDate).toLocaleDateString()}
          </p>
        )}
        {argument.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/arguments" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Arguments
        </Link>
      </div>
    </div>
  );
};

export default ArgumentEntryPage;
