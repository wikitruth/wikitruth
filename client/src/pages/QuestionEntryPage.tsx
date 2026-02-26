import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
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
import type { Answer, Issue, Opinion } from '../types';

const QuestionEntryPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<QuestionEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestionEntry();
  }, [id]);

  const fetchQuestionEntry = async () => {
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
  };

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
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Questions', url: '/questions' },
    { title: question.title, active: true }
  ];

  // Build tabs
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/questions/entry/${question.friendlyUrl}/${question._id}` },
    {
      id: 'answers',
      title: 'Answers',
      url: `/questions/entry/${question.friendlyUrl}/${question._id}/answers`,
      count: question.childrenCount?.answers?.accepted ?? answers.length,
    },
    {
      id: 'discussion',
      title: 'Discussion',
      url: `/questions/entry/${question.friendlyUrl}/${question._id}/discussion`,
      count: question.childrenCount?.opinions?.accepted ?? opinions.length,
    }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader 
        title={question.title}
        subtitle={question.subtitle}
        icon="question-circle"
        iconColor="text-success-x"
        actions={<EntryActionsMenu entry={question} editPath={`/questions/edit/${encodeURIComponent(question._id)}`} />}
      />
      
      <PageTabs tabs={tabs} />

      {/* Question content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {question.content ? (
          <div dangerouslySetInnerHTML={{ __html: question.content }} />
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

      {/* Footer meta information */}
      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {question.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Asked by: <strong>{question.editorUsername}</strong>
          </p>
        )}
        {question.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(question.editDate).toLocaleDateString()}
          </p>
        )}
        {question.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/questions" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Questions
        </Link>
      </div>
    </div>
  );
};

export default QuestionEntryPage;
