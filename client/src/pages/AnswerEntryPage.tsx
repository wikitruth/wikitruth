import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/common/Alert';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import EntryList from '../components/common/EntryList';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import apiService from '../services/api';
import type { LegacyEntity } from '../types/legacy';
import type { AnswerEntryResponse } from '../types/api';
import type { Issue, Opinion } from '../types';

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

  return (
    <div>
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Answers', url: '/answers' }, { title: answer.title, active: true }]} />
      <PageHeader
        title={answer.title}
        icon="list-alt"
        iconColor="text-primary"
        actions={
          <Link to={`/answers/edit/${answer._id}`} className="btn btn-default">
            <i className="fa fa-pencil"></i> Edit
          </Link>
        }
      />

      <div className="text-body" style={{ marginTop: '20px' }}>
        <div dangerouslySetInnerHTML={{ __html: answer.content || answer.description || '' }} />
      </div>

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

      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {answer.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Authored by: <strong>{answer.editorUsername}</strong>
          </p>
        )}
        {answer.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(answer.editDate).toLocaleDateString()}
          </p>
        )}
        {answer.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <Link to="/answers" className="btn btn-default" style={{ marginTop: '20px' }}>
        <i className="fa fa-arrow-left"></i> Back to Answers
      </Link>
    </div>
  );
};

export default AnswerEntryPage;
