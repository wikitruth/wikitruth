import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/common/Alert';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import apiService from '../services/api';
import type { LegacyEntity, LegacyResponse } from '../types/legacy';

const AnswerEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [answer, setAnswer] = useState<LegacyEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnswer = async () => {
      if (!id) {
        setError('Answer ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = (await apiService.getAnswerEntry(id)) as LegacyResponse;
        setAnswer(result?.answer || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load answer');
      } finally {
        setLoading(false);
      }
    };

    fetchAnswer();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading answer..." />;
  }

  if (error || !answer) {
    return <Alert type="danger">{error || 'Answer not found'}</Alert>;
  }

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

      <Link to="/answers" className="btn btn-default" style={{ marginTop: '20px' }}>
        <i className="fa fa-arrow-left"></i> Back to Answers
      </Link>
    </div>
  );
};

export default AnswerEntryPage;
