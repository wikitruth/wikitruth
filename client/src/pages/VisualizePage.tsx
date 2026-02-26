import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import type { HomeDataResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';

const VisualizePage: React.FC = () => {
  const [data, setData] = useState<HomeDataResponse | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisualizationData = async () => {
      try {
        setLoading(true);
        const result = await apiService.getHomeData();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load visualization data');
      } finally {
        setLoading(false);
      }
    };

    fetchVisualizationData();
  }, []);

  const topics = (data?.topics || []) as LegacyEntity[];
  const argumentsList = (data?.arguments || []) as LegacyEntity[];
  const questions = (data?.questions || []) as LegacyEntity[];
  const issues = (data?.issues || []) as LegacyEntity[];
  const opinions = (data?.opinions || []) as LegacyEntity[];
  const artifacts = (data?.artifacts || []) as LegacyEntity[];
  const answers = (data?.answers || []) as LegacyEntity[];

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic._id === selectedTopicId) || null,
    [selectedTopicId, topics]
  );

  const topicRelatedEntries = useMemo(() => {
    if (!selectedTopicId) {
      return [];
    }

    const collections = [
      ...argumentsList.map((entry) => ({ kind: 'Argument', entry })),
      ...questions.map((entry) => ({ kind: 'Question', entry })),
      ...issues.map((entry) => ({ kind: 'Issue', entry })),
      ...opinions.map((entry) => ({ kind: 'Opinion', entry })),
      ...artifacts.map((entry) => ({ kind: 'Artifact', entry })),
      ...answers.map((entry) => ({ kind: 'Answer', entry })),
    ];

    return collections.filter(({ entry }) => {
      const ownerId = String(entry.ownerId || '');
      const topicId = String(entry.topicId || '');
      const parentTopicId = String(entry.parentId || '');
      return ownerId === selectedTopicId || topicId === selectedTopicId || parentTopicId === selectedTopicId;
    });
  }, [argumentsList, artifacts, answers, issues, opinions, questions, selectedTopicId]);

  if (loading) {
    return <LoadingSpinner message="Loading visualization..." />;
  }

  if (error) {
    return <Alert type="danger">Failed to load visualization: {error}</Alert>;
  }

  const metrics = [
    { key: 'topics', title: 'Topics', count: topics.length, icon: 'folder-open', color: 'text-success-x' },
    { key: 'arguments', title: 'Arguments', count: argumentsList.length, icon: 'flash', color: 'text-primary' },
    { key: 'questions', title: 'Questions', count: questions.length, icon: 'question-circle', color: 'text-info' },
    { key: 'issues', title: 'Issues', count: issues.length, icon: 'exclamation-triangle', color: 'text-warning' },
    { key: 'opinions', title: 'Opinions', count: opinions.length, icon: 'comment', color: 'text-info' },
    { key: 'artifacts', title: 'Artifacts', count: artifacts.length, icon: 'paperclip', color: 'text-muted' },
    { key: 'answers', title: 'Answers', count: answers.length, icon: 'list-alt', color: 'text-primary' },
  ];

  const renderEntryUrl = (entry: LegacyEntity, kind: string) => {
    const id = entry._id;
    const friendlyUrl = entry.friendlyUrl || '';
    switch (kind) {
      case 'Argument':
        return `/arguments/entry/${friendlyUrl}/${id}`;
      case 'Question':
        return `/questions/entry/${friendlyUrl}/${id}`;
      case 'Issue':
        return `/issues/entry/${friendlyUrl}/${id}`;
      case 'Opinion':
        return `/opinions/entry/${friendlyUrl}/${id}`;
      case 'Artifact':
        return `/artifacts/entry/${friendlyUrl}/${id}`;
      case 'Answer':
        return `/answers/entry/${id}`;
      default:
        return '/';
    }
  };

  return (
    <div>
      <h1 className="page-header">
        <i className="fa fa-snowflake-o"></i> Visualize
      </h1>

      <div className="alert alert-info" role="note">
        <h4><i className="fa fa-info-circle"></i> Knowledge Graph Explorer</h4>
        <p>
          Explore live topic relationships and connected contributions using current public data.
          Select a topic node to inspect related arguments, questions, issues, opinions, artifacts, and answers.
        </p>
      </div>

      <div className="row">
        {metrics.map((metric) => (
          <div key={metric.key} className="col-sm-6 col-md-3" style={{ marginBottom: '12px' }}>
            <div className="panel panel-default">
              <div className="panel-body">
                <div className="text-muted" style={{ marginBottom: '4px' }}>
                  <i className={`fa fa-${metric.icon} ${metric.color}`} aria-hidden="true"></i> {metric.title}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{metric.count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <div className="col-md-5">
          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Topic Nodes</h3>
            </div>
            <div className="panel-body">
              {topics.length === 0 ? (
                <Alert type="warning">No topics available for visualization.</Alert>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {topics.map((topic) => (
                    <button
                      key={topic._id}
                      type="button"
                      onClick={() => setSelectedTopicId(topic._id)}
                      className={`btn ${selectedTopicId === topic._id ? 'btn-success' : 'btn-default'}`}
                      style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">
                {selectedTopic ? `Connections for "${selectedTopic.title}"` : 'Select a Topic Node'}
              </h3>
            </div>
            <div className="panel-body">
              {!selectedTopic && (
                <p className="text-muted">Choose a topic to inspect connected entities.</p>
              )}

              {selectedTopic && topicRelatedEntries.length === 0 && (
                <Alert type="warning">No related entries found for this topic in the current dataset.</Alert>
              )}

              {selectedTopic && topicRelatedEntries.length > 0 && (
                <ul className="list-group">
                  {topicRelatedEntries.map(({ kind, entry }) => (
                    <li key={`${kind}-${entry._id}`} className="list-group-item">
                      <span className="label label-default" style={{ marginRight: '8px' }}>{kind}</span>
                      <Link to={renderEntryUrl(entry, kind)}>{entry.title || '(Untitled)'}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/" className="btn btn-primary">
          <i className="fa fa-home"></i> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default VisualizePage;
