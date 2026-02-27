import React, { useEffect, useMemo, useState } from 'react';
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
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import type { TopicEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';

const CONTENT_COLLAPSE_THRESHOLD = 1200;

function getCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

const TopicEntryPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<TopicEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

  useEffect(() => {
    const fetchTopicEntry = async () => {
      if (!id) {
        setError('Topic id is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.getTopicEntry(id);
        setData(result);
      } catch (err) {
        console.error('Error fetching topic entry:', err);
        setError('Failed to load topic');
      } finally {
        setLoading(false);
      }
    };

    void fetchTopicEntry();
  }, [id]);

  const topic = (data?.topic || {}) as LegacyEntity;
  const topics = ((data?.topics || data?.topicChildren || []) as LegacyEntity[]).slice(0, 6);
  const siblingTopics = ((data?.topicSiblings || []) as LegacyEntity[]).slice(0, 6);
  const args = (data?.arguments || []) as LegacyEntity[];
  const questions = (data?.questions || []) as LegacyEntity[];
  const artifacts = (data?.artifacts || []) as LegacyEntity[];
  const issues = (data?.issues || []) as LegacyEntity[];
  const opinions = (data?.opinions || []) as LegacyEntity[];
  const topicLinks = (data?.topicLinks || []) as LegacyEntity[];
  const categories = (data?.categories || []) as LegacyEntity[];

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Topics', url: '/topics' },
    { title: topic.title, active: true }
  ];

  const tabs = [
    { id: 'overview', title: 'Overview', url: `/topics/entry/${topic.friendlyUrl}/${topic._id}` },
    {
      id: 'discussion',
      title: 'Discussion',
      url: `/topics/entry/${topic.friendlyUrl}/${topic._id}/discussion`,
      count: topic.childrenCount?.opinions?.accepted ?? opinions.length,
    }
  ];

  const content = String(topic.content || topic.description || '');
  const showSeeMore = content.length > CONTENT_COLLAPSE_THRESHOLD;
  const contentStyle = showSeeMore && !showFullContent
    ? { maxHeight: '450px', overflow: 'hidden', position: 'relative' as const }
    : undefined;

  const topicStats = useMemo(() => {
    const children = topic?.childrenCount || {};
    return [
      {
        key: 'topics',
        label: 'Topics',
        icon: 'folder-open',
        count: getCount(children.topics?.accepted) || topics.length,
        to: `/topics/${topic.friendlyUrl || ''}/${topic._id || ''}`,
      },
      {
        key: 'arguments',
        label: 'Facts',
        icon: 'flash',
        count: getCount(children.arguments?.accepted) || args.length,
        to: `/arguments?topic=${encodeURIComponent(String(topic._id || ''))}`,
      },
      {
        key: 'questions',
        label: 'Questions',
        icon: 'question-circle',
        count: getCount(children.questions?.accepted) || questions.length,
        to: `/questions?topic=${encodeURIComponent(String(topic._id || ''))}`,
      },
      {
        key: 'issues',
        label: 'Issues',
        icon: 'exclamation-circle',
        count: getCount(children.issues?.accepted) || issues.length,
        to: `/issues?topic=${encodeURIComponent(String(topic._id || ''))}`,
      },
      {
        key: 'opinions',
        label: 'Comments',
        icon: 'comments-o',
        count: getCount(children.opinions?.accepted) || opinions.length,
        to: `/opinions?topic=${encodeURIComponent(String(topic._id || ''))}`,
      },
      {
        key: 'artifacts',
        label: 'Artifacts',
        icon: 'paperclip',
        count: getCount(children.artifacts?.accepted) || artifacts.length,
        to: `/artifacts?topic=${encodeURIComponent(String(topic._id || ''))}`,
      },
    ];
  }, [args.length, artifacts.length, issues.length, opinions.length, questions.length, topic._id, topic.childrenCount, topic.friendlyUrl, topics.length]);

  if (loading) {
    return <LoadingSpinner message="Loading topic..." />;
  }

  if (error || !data?.topic) {
    return <Alert type="danger">{error || 'Topic not found'}</Alert>;
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />

      <PageHeader
        title={topic.title}
        subtitle={topic.subtitle}
        icon="folder-open"
        iconColor="text-success-x"
        actions={<EntryActionsMenu entry={topic} editPath={`/topics/create?id=${encodeURIComponent(topic._id)}`} />}
      />

      <PageTabs tabs={tabs} />

      <div className="row" style={{ marginBottom: '10px' }}>
        {topicStats.map((stat) => (
          <div key={stat.key} className="col-sm-4 col-md-2" style={{ marginBottom: '12px' }}>
            <Link to={stat.to} className="no-underline">
              <div className="well stat" style={{ marginBottom: 0 }}>
                <div className="stat-value">{stat.count}</div>
                <div className="stat-label"><i className={`fa fa-${stat.icon}`}></i> {stat.label}</div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="text-body collapsible" style={{ marginTop: '20px', ...contentStyle }}>
        {topic.content ? (
          <div dangerouslySetInnerHTML={{ __html: topic.content }} />
        ) : topic.description ? (
          <p className="lead">{topic.description}</p>
        ) : (
          <p className="text-muted">No content available for this topic yet.</p>
        )}
        {showSeeMore && !showFullContent && (
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setShowFullContent(true);
            }}
            className="content-see-more"
          >
            <div className="content-see-more-gradient"></div>
            <div className="content-see-more-text">See more</div>
          </a>
        )}
      </div>

      <div className="wt-related" style={{ marginTop: '20px' }}>
        <span title="Related Topics">Topics</span>&nbsp;
        {topic.parentTopic && (
          <Link to={`/topics/entry/${topic.parentTopic.friendlyUrl}/${topic.parentTopic._id}`}>
            <span className="wt-label label label-default">{topic.parentTopic.title}</span>
          </Link>
        )}
        {topicLinks.map((link) => (
          <Link key={link._id} to={`/topics/entry/${link.friendlyUrl}/${link._id}`}>
            <span className="wt-label label label-default">{link.title}</span>
          </Link>
        ))}
        {!topic.parentTopic && topicLinks.length === 0 && <span className="text-muted">No linked topics</span>}
      </div>

      {(topics.length > 0 || siblingTopics.length > 0 || categories.length > 0) && (
        <div className="panel panel-default" style={{ marginTop: '20px' }}>
          <div className="panel-heading">
            <h3 className="panel-title">Branch Context</h3>
          </div>
          <div className="panel-body">
            {categories.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Peer Categories:</strong>{' '}
                {categories.map((item) => (
                  <Link key={item._id} to={`/topics/entry/${item.friendlyUrl}/${item._id}`} className="wt-label label label-default" style={{ marginRight: '4px' }}>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
            {topics.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Subtopics:</strong>{' '}
                {topics.map((item) => (
                  <Link key={item._id} to={`/topics/entry/${item.friendlyUrl}/${item._id}`} className="wt-label label label-default" style={{ marginRight: '4px' }}>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
            {siblingTopics.length > 0 && (
              <div>
                <strong>Sibling topics:</strong>{' '}
                {siblingTopics.map((item) => (
                  <Link key={item._id} to={`/topics/entry/${item.friendlyUrl}/${item._id}`} className="wt-label label label-default" style={{ marginRight: '4px' }}>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <EntryList
          title="Topics"
          icon="folder-open"
          iconColor="text-success-x"
          count={topic.childrenCount?.topics?.accepted ?? topics.length}
          moreUrl={(topic.childrenCount?.topics?.accepted ?? topics.length) > 5 ? `/topics/${topic.friendlyUrl}/${topic._id}` : undefined}
        >
          {topics.map((t) => (
            <TopicEntryRow key={t._id} topic={t as unknown as Topic} subtitle={false} />
          ))}
        </EntryList>
      )}

      {args.length > 0 && (
        <EntryList
          title="Facts"
          icon="flash"
          iconColor="text-primary"
          count={topic.childrenCount?.arguments?.accepted ?? args.length}
        >
          {args.map((arg) => (
            <ArgumentEntryRow key={arg._id} argument={arg as unknown as Argument} subtitle={false} />
          ))}
        </EntryList>
      )}

      {questions.length > 0 && (
        <EntryList
          title="Questions"
          icon="question-circle"
          iconColor="text-success-x"
          count={topic.childrenCount?.questions?.accepted ?? questions.length}
        >
          {questions.map((q) => (
            <QuestionEntryRow key={q._id} question={q as unknown as Question} subtitle={false} />
          ))}
        </EntryList>
      )}

      {artifacts.length > 0 && (
        <EntryList
          title="Artifacts"
          icon="paperclip"
          iconColor="text-muted"
          count={topic.childrenCount?.artifacts?.accepted ?? artifacts.length}
        >
          {artifacts.map((artifact) => (
            <li key={artifact._id} className="list-group-item">
              <Link to={`/artifacts/entry/${(artifact as unknown as Artifact).friendlyUrl || artifact._id}/${artifact._id}`}>
                {artifact.title || '(Untitled)'}
              </Link>
            </li>
          ))}
        </EntryList>
      )}

      {issues.length > 0 && (
        <EntryList
          title="Issues"
          icon="exclamation-triangle"
          iconColor="text-warning"
          count={topic.childrenCount?.issues?.accepted ?? issues.length}
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
          count={topic.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

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
