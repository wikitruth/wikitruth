import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import EntryList from '../components/common/EntryList';
import Alert from '../components/common/Alert';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';

const TopicEntryPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopicEntry();
  }, [id]);

  const fetchTopicEntry = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const result: any = await apiService.getTopicEntry(id);
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching topic entry:', err);
      setError('Failed to load topic');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading topic..." />;
  }

  if (error || !data?.topic) {
    return <Alert type="danger">{error || 'Topic not found'}</Alert>;
  }

  const { topic, topics, arguments: args, questions } = data;
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Topics', url: '/topics' },
    { title: topic.title, active: true }
  ];

  // Build tabs for the topic entry
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/topics/entry/${topic.friendlyUrl}/${topic._id}` },
    { id: 'discussion', title: 'Discussion', url: `/topics/entry/${topic.friendlyUrl}/${topic._id}/discussion`, count: 0 }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader 
        title={topic.title}
        subtitle={topic.subtitle}
        icon="folder-open"
        iconColor="text-success-x"
      />
      
      <PageTabs tabs={tabs} activeTab="overview" />

      {/* Topic content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {topic.content ? (
          <div dangerouslySetInnerHTML={{ __html: topic.content }} />
        ) : topic.description && (
          <p className="lead">{topic.description}</p>
        )}
      </div>

      {/* Related Topics */}
      {topic.parentTopic && (
        <div className="wt-related" style={{ marginTop: '20px' }}>
          <span title="Related Topics">Topics</span>&nbsp;
          <Link to={`/topics/entry/${topic.parentTopic.friendlyUrl}/${topic.parentTopic._id}`}>
            <span className="wt-label label label-default">{topic.parentTopic.title}</span>
          </Link>
        </div>
      )}

      {/* Subtopics List */}
      {topics && topics.length > 0 && (
        <EntryList
          title="Topics"
          icon="folder-open"
          iconColor="text-success-x"
          count={topic.childrenCount?.topics?.accepted}
          moreUrl={topic.childrenCount?.topics?.accepted > 5 ? `/topics/${topic.friendlyUrl}/${topic._id}` : undefined}
        >
          {topics.map((t: any) => (
            <TopicEntryRow key={t._id} topic={t} subtitle={false} />
          ))}
        </EntryList>
      )}

      {/* Arguments List */}
      {args && args.length > 0 && (
        <EntryList
          title="Facts"
          icon="flash"
          iconColor="text-primary"
          count={topic.childrenCount?.arguments?.accepted}
        >
          {args.map((arg: any) => (
            <ArgumentEntryRow key={arg._id} argument={arg} subtitle={false} />
          ))}
        </EntryList>
      )}

      {/* Questions List */}
      {questions && questions.length > 0 && (
        <EntryList
          title="Questions"
          icon="question-circle"
          iconColor="text-success-x"
          count={topic.childrenCount?.questions?.accepted}
        >
          {questions.map((q: any) => (
            <QuestionEntryRow key={q._id} question={q} subtitle={false} />
          ))}
        </EntryList>
      )}

      {/* Footer meta information */}
      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {topic.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Edited by: <strong>{topic.editorUsername}</strong>
          </p>
        )}
        {topic.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(topic.editDate).toLocaleDateString()}
          </p>
        )}
        {topic.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/topics" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Topics
        </Link>
      </div>
    </div>
  );
};

export default TopicEntryPage;
