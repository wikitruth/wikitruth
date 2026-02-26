import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import type { LegacyEntity, LegacyResponse } from '../types/legacy';

const QuestionEntryPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<LegacyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestionEntry();
  }, [id]);

  const fetchQuestionEntry = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const result = (await apiService.getQuestionEntry(id)) as LegacyResponse;
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
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Questions', url: '/questions' },
    { title: question.title, active: true }
  ];

  // Build tabs
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/questions/entry/${question.friendlyUrl}/${question._id}` },
    { id: 'answers', title: 'Answers', url: `/questions/entry/${question.friendlyUrl}/${question._id}/answers`, count: 0 },
    { id: 'discussion', title: 'Discussion', url: `/questions/entry/${question.friendlyUrl}/${question._id}/discussion`, count: 0 }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader 
        title={question.title}
        subtitle={question.subtitle}
        icon="question-circle"
        iconColor="text-success-x"
        actions={
          <Link to={`/questions/edit/${question._id}`} className="btn btn-default">
            <i className="fa fa-pencil"></i> Edit
          </Link>
        }
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
