import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
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
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import type { TopicEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';
import { formatRelativeTime } from '../utils/dateFormat';
import { sanitizeHtml } from '../utils/sanitizeHtml';

const CONTENT_COLLAPSE_THRESHOLD = 1200;

function getCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTopicPath(topic: Partial<LegacyEntity>): string {
  const id = encodeURIComponent(String(topic._id || ''));
  const friendly = encodeURIComponent(String(topic.friendlyUrl || topic._id || ''));
  return `/topics/entry/${friendly}/${id}`;
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
  const topics = ((data?.topics || data?.topicChildren || []) as LegacyEntity[]).slice(0, 15);
  const keyTopics = ((data?.keyTopics || []) as LegacyEntity[]).slice(0, 6);
  const keyArguments = ((data?.keyArguments || []) as LegacyEntity[]).slice(0, 6);
  const siblingTopics = ((data?.topicSiblings || []) as LegacyEntity[]).slice(0, 6);
  const args = (data?.arguments || []) as LegacyEntity[];
  const questions = (data?.questions || []) as LegacyEntity[];
  const artifacts = (data?.artifacts || []) as LegacyEntity[];
  const issues = (data?.issues || []) as LegacyEntity[];
  const opinions = (data?.opinions || []) as LegacyEntity[];
  const topicLinks = (data?.topicLinks || []) as LegacyEntity[];
  const categories = (data?.categories || []) as LegacyEntity[];
  const isMainTopic = Boolean(data?.mainTopic);
  const tagLabels = Array.isArray(data?.tagLabels) ? (data?.tagLabels as LegacyEntity[]) : [];

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Topics', url: '/topics' },
    { title: topic.title, active: true },
  ];

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: getTopicPath(topic),
    },
    {
      id: 'topics',
      title: 'Topics',
      icon: 'folder-open',
      url: `/topics/${encodeURIComponent(String(topic.friendlyUrl || ''))}/${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.topics?.accepted),
    },
    {
      id: 'arguments',
      title: 'Facts',
      icon: 'flash',
      url: `/arguments?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.arguments?.accepted),
    },
    {
      id: 'questions',
      title: 'Questions',
      icon: 'question-circle',
      url: `/questions?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.questions?.accepted),
    },
    {
      id: 'issues',
      title: 'Issues',
      icon: 'exclamation-circle',
      url: `/issues?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.issues?.accepted),
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: 'comments-o',
      url: `/opinions?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.opinions?.accepted),
    },
  ];

  const content = String(topic.content || topic.description || '');
  const showSeeMore = content.length > CONTENT_COLLAPSE_THRESHOLD;
  const contentStyle = showSeeMore && !showFullContent
    ? { maxHeight: '450px', overflow: 'hidden', position: 'relative' as const }
    : undefined;

  if (loading) {
    return <LoadingSpinner message="Loading topic..." />;
  }

  if (error || !data?.topic) {
    return <Alert type="danger">{error || 'Topic not found'}</Alert>;
  }

  return (
    <div>
      <PageMeta title={topic.title} description={topic.description || topic.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={topic.title || 'topic'} height={100} />

      <PageHeader
        title={topic.title}
        subtitle={topic.subtitle}
        icon="folder-open"
        iconColor="text-success-x"
      />

      <div className="text-muted" style={{ marginTop: '-6px', marginBottom: '8px' }}>
        <small>
          <i className="fa fa-folder-open-o" aria-hidden="true"></i> A topic category{' '}
          {topic.editDate ? (
            <>
              <i className="fa fa-clock-o" aria-hidden="true"></i> {new Date(topic.editDate).toLocaleString()}
            </>
          ) : null}
        </small>
      </div>

      <div style={{ marginBottom: '8px' }}>
        {topic.screening?.status === 0 ? (
          <span className="label label-warning" style={{ marginRight: '6px' }}>
            unverified
          </span>
        ) : null}
        {typeof data?.linkCount === 'number' && data.linkCount > 1 ? (
          <span className="label label-warning" style={{ marginRight: '6px' }}>
            {data.linkCount}
          </span>
        ) : null}
        {isMainTopic ? (
          <span className="label label-info" style={{ marginRight: '6px' }}>
            Main
          </span>
        ) : null}
        {tagLabels.map((tag, index) => {
          const theme = String(tag.theme || 'default');
          const label = String(tag.label || tag.title || '');
          if (!label) {
            return null;
          }
          const className = `label label-${theme}`;
          return (
            <span key={`tag-label-${index}`} className={className} style={{ marginRight: '6px' }}>
              {label}
            </span>
          );
        })}
      </div>

      <EntryQuickActions
        entry={topic}
        objectName="topic"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={topic} editPath={`/topics/create?id=${encodeURIComponent(String(topic._id || ''))}`} />}
      />

      <PageTabs tabs={tabs} activeTab="details" />

      <div className="text-body collapsible" style={{ marginTop: '20px', ...contentStyle }}>
        {topic.content ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(topic.content) }} />
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

      {(keyTopics.length > 0 || keyArguments.length > 0) && (
        <div style={{ marginTop: '18px' }}>
          {keyTopics.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ marginTop: 0 }}>Key topics</h3>
              <ul>
                {keyTopics.map((item) => (
                  <li key={`key-topic-${item._id}`}>
                    <Link to={getTopicPath(item)}>{item.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {keyArguments.length > 0 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Key facts</h3>
              <ul>
                {keyArguments.map((item) => (
                  <li key={`key-argument-${item._id}`}>
                    <Link to={`/arguments/entry/${encodeURIComponent(String(item.friendlyUrl || item._id))}/${encodeURIComponent(String(item._id))}`}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="wt-related" style={{ marginTop: '20px' }}>
        <span title="Related Topics">Topics</span>&nbsp;
        {topic.parentTopic && (
          <Link to={getTopicPath(topic.parentTopic)}>
            <span className="wt-label label label-default">{topic.parentTopic.title}</span>
          </Link>
        )}
        {topicLinks.map((link) => (
          <Link key={link._id} to={getTopicPath(link)}>
            <span className="wt-label label label-default">{link.title}</span>
          </Link>
        ))}
        {!topic.parentTopic && topicLinks.length === 0 && <span className="text-muted">No linked topics</span>}
      </div>

      {isMainTopic && categories.length > 0 && (
        <div className="row" style={{ marginTop: '25px' }}>
          {categories.map((category) => {
            const subtopics = Array.isArray(category.subtopics) ? (category.subtopics as LegacyEntity[]).slice(0, 3) : [];
            const subarguments = Array.isArray(category.subarguments) ? (category.subarguments as LegacyEntity[]).slice(0, 3) : [];
            return (
              <div key={`category-tile-${category._id}`} className="col-lg-4 col-md-6 col-sm-6">
                <div className="media wt-category">
                  <div className="media-left media-top">
                    <Link to={getTopicPath(category)}>
                      <GeoPatternBackground
                        seed={String(category.title || category._id)}
                        className="wt-category-icon wt-geopattern-title"
                        height={90}
                      />
                    </Link>
                  </div>
                  <div className="media-body">
                    <h4 className="media-heading">
                      <Link to={getTopicPath(category)}>{category.title}</Link>
                    </h4>
                    {subtopics.map((subtopic) => (
                      <div key={`cat-subtopic-${subtopic._id}`}>
                        <i className="fa fa-folder-open text-muted" aria-hidden="true"></i>{' '}
                        <Link to={getTopicPath(subtopic)}>{String(subtopic.shortTitle || subtopic.title || '(Untitled)')}</Link>
                      </div>
                    ))}
                    {subarguments.map((subargument) => (
                      <div key={`cat-subarg-${subargument._id}`}>
                        <i className="fa fa-flash text-muted" aria-hidden="true"></i>{' '}
                        <Link to={`/arguments/entry/${encodeURIComponent(String(subargument.friendlyUrl || subargument._id))}/${encodeURIComponent(String(subargument._id))}`}>
                          {String(subargument.shortTitle || subargument.title || '(Untitled)')}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isMainTopic && (topics.length > 0 || siblingTopics.length > 0 || categories.length > 0) && (
        <div className="panel panel-default" style={{ marginTop: '20px' }}>
          <div className="panel-heading">
            <h3 className="panel-title">Branch Context</h3>
          </div>
          <div className="panel-body">
            {categories.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Peer Categories:</strong>{' '}
                {categories.map((item) => (
                  <Link key={item._id} to={getTopicPath(item)} className="wt-label label label-default" style={{ marginRight: '4px' }}>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
            {topics.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Subtopics:</strong>{' '}
                {topics.map((item) => (
                  <Link key={item._id} to={getTopicPath(item)} className="wt-label label label-default" style={{ marginRight: '4px' }}>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
            {siblingTopics.length > 0 && (
              <div>
                <strong>Sibling topics:</strong>{' '}
                {siblingTopics.map((item) => (
                  <Link key={item._id} to={getTopicPath(item)} className="wt-label label label-default" style={{ marginRight: '4px' }}>
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
          moreUrl={(topic.childrenCount?.topics?.accepted ?? topics.length) > 15 ? `/topics/${topic.friendlyUrl}/${topic._id}` : undefined}
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
            <i className="fa fa-clock-o"></i> Last updated: {formatRelativeTime(topic.editDate)}
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
