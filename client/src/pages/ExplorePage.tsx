import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { HomeDataResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Answer, Argument, Issue, Opinion, Question, Topic } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';
import PageHeader from '../components/common/PageHeader';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import ContentViewFilter, { type ViewMode } from '../components/common/ContentViewFilter';
import { useNotification } from '../context/NotificationContext';

type ExploreTab = 'all' | 'topics' | 'arguments' | 'questions' | 'answers' | 'artifacts' | 'issues' | 'opinions';

type ExploreCategory = LegacyEntity & {
  title?: string;
  contextTitle?: string;
  friendlyUrl?: string;
  _id: string;
  subtopics?: LegacyEntity[];
  subarguments?: LegacyEntity[];
  childrenCount?: {
    topics?: { accepted?: number };
    arguments?: { accepted?: number };
  };
};

function getTopicEntryPath(topic: Pick<ExploreCategory, 'friendlyUrl' | '_id'>): string {
  const friendly = encodeURIComponent(String(topic.friendlyUrl || topic._id || ''));
  const id = encodeURIComponent(String(topic._id || ''));
  return `/topics/entry/${friendly}/${id}`;
}

function getArgumentEntryPath(argument: Pick<LegacyEntity, 'friendlyUrl' | '_id'>): string {
  const friendly = encodeURIComponent(String(argument.friendlyUrl || argument._id || ''));
  const id = encodeURIComponent(String(argument._id || ''));
  return `/arguments/entry/${friendly}/${id}`;
}

const ExplorePage: React.FC = () => {
  const [data, setData] = useState<HomeDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ExploreTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('wt_view_mode');
    return saved === 'wiki' || saved === 'original' ? saved : 'all';
  });
  const { addToast } = useNotification();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await apiService.getHomeData();
        if (mounted) {
          setData(result);
        }
      } catch (_error) {
        if (mounted) {
          addToast('danger', 'Failed to load explore data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [addToast]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('wt_view_mode', mode);
  };

  const sections = useMemo(() => {
    const source = data || {};
    return [
      {
        key: 'topics' as const,
        label: 'Topics',
        icon: 'folder-open',
        items: source.topics || [],
        more: Boolean(source.topicsMore),
        morePath: '/topics',
      },
      {
        key: 'arguments' as const,
        label: 'Facts',
        icon: 'flash',
        items: source.arguments || [],
        more: Boolean(source.argumentsMore),
        morePath: '/arguments',
      },
      {
        key: 'questions' as const,
        label: 'Questions',
        icon: 'question-circle',
        items: source.questions || [],
        more: Boolean(source.questionsMore),
        morePath: '/questions',
      },
      {
        key: 'answers' as const,
        label: 'Answers',
        icon: 'check-circle',
        items: source.answers || [],
        more: Boolean(source.answersMore),
        morePath: '/answers',
      },
      {
        key: 'artifacts' as const,
        label: 'Artifacts',
        icon: 'puzzle-piece',
        items: source.artifacts || [],
        more: Boolean(source.artifactsMore),
        morePath: '/artifacts',
      },
      {
        key: 'issues' as const,
        label: 'Issues',
        icon: 'exclamation-circle',
        items: source.issues || [],
        more: Boolean(source.issuesMore),
        morePath: '/issues',
      },
      {
        key: 'opinions' as const,
        label: 'Comments',
        icon: 'comments-o',
        items: source.opinions || [],
        more: Boolean(source.opinionsMore),
        morePath: '/opinions',
      },
    ];
  }, [data]);

  const categories: ExploreCategory[] = (data?.appCategories || []) as ExploreCategory[];

  if (loading) {
    return <LoadingSpinner message="Loading explore..." />;
  }

  return (
    <div>
      <PageMeta title="Explore" description="Discover categories and latest posts" />
      <PageHeader title="Explore" icon="globe" iconColor="text-muted-x" />

      {categories.length > 0 && (
        <div className="row">
          {categories.map((category) => {
            const topicLink = getTopicEntryPath(category);
            const title = String(category.contextTitle || category.title || '(Untitled)');
            const subtopics = Array.isArray(category.subtopics) ? category.subtopics.slice(0, 5) : [];
            const subarguments = Array.isArray(category.subarguments) ? category.subarguments.slice(0, 5) : [];
            const moreCount =
              Number(category.childrenCount?.topics?.accepted || 0) ||
              Number(category.childrenCount?.arguments?.accepted || 0) ||
              0;

            return (
              <div key={category._id} className="col-lg-4 col-md-6 col-sm-6">
                <div className="media wt-category">
                  <div className="media-left media-top">
                    <Link to={topicLink}>
                      <GeoPatternBackground seed={title} className="wt-category-icon wt-geopattern-title" height={90} />
                    </Link>
                  </div>
                  <div className="media-body">
                    <h4 className="media-heading">
                      <Link to={topicLink}>{title}</Link>
                    </h4>
                    <div>
                      {subtopics.map((subtopic) => (
                        <div key={`subtopic-${String(subtopic._id)}`}>
                          <i className="fa fa-folder-open text-muted text-success-x" aria-hidden="true"></i>{' '}
                          <Link to={getTopicEntryPath(subtopic as ExploreCategory)}>
                            {String(subtopic.shortTitle || subtopic.title || '(Untitled)')}
                          </Link>
                        </div>
                      ))}
                      {subarguments.map((subargument) => (
                        <div key={`subargument-${String(subargument._id)}`}>
                          <i className="fa fa-flash text-muted text-success-x" aria-hidden="true"></i>{' '}
                          <Link to={getArgumentEntryPath(subargument)}>
                            {String(subargument.shortTitle || subargument.title || '(Untitled)')}
                          </Link>
                        </div>
                      ))}
                      {(subtopics.length > 0 || subarguments.length > 0 || moreCount > 0) && (
                        <div>
                          <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i>{' '}
                          <Link to={topicLink}>
                            more{moreCount > 0 ? <span className="wt-label label label-default"> {moreCount}</span> : null}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h1 className="page-header wt-header" id="browse">Latest Posts</h1>
      <div style={{ marginBottom: 15 }} className="wt-btn-group">
        <ContentViewFilter value={viewMode} onChange={handleViewModeChange} />
      </div>

      <ul className="nav nav-tabs wt-tabs" role="tablist">
        {([
          { key: 'all', icon: 'globe', label: 'All' },
          { key: 'topics', icon: 'folder-open', label: 'Topics' },
          { key: 'arguments', icon: 'flash', label: 'Facts' },
          { key: 'questions', icon: 'question-circle', label: 'Questions' },
          { key: 'answers', icon: 'check-circle', label: 'Answers' },
          { key: 'artifacts', icon: 'puzzle-piece', label: 'Artifacts' },
          { key: 'issues', icon: 'exclamation-circle', label: 'Issues' },
          { key: 'opinions', icon: 'comments-o', label: 'Comments' },
        ] as Array<{ key: ExploreTab; icon: string; label: string }>).map((tab) => (
          <li key={tab.key} role="presentation" className={activeTab === tab.key ? 'active' : ''}>
            <a
              href="#browse"
              role="tab"
              onClick={(event) => {
                event.preventDefault();
                setActiveTab(tab.key);
              }}
            >
              <i className={`fa fa-${tab.icon}`} aria-hidden="true"></i> {tab.label}
            </a>
          </li>
        ))}
      </ul>

      <div>
        {sections
          .filter((section) => activeTab === 'all' || section.key === activeTab)
          .map((section) => {
            if (!Array.isArray(section.items) || section.items.length === 0) {
              return null;
            }

            return (
              <div key={section.key} className="wt-list-container">
                <ul className="list-group wt-list">
                  <li className="list-group-item highlight">
                    <i className={`fa fa-${section.icon} text-muted-x`} aria-hidden="true"></i>
                    <div>{section.label}</div>
                  </li>
                  {section.key === 'topics' && section.items.map((item) => (
                    <TopicEntryRow key={String(item._id)} topic={item as unknown as Topic} subtitle={true} />
                  ))}
                  {section.key === 'arguments' && section.items.map((item) => (
                    <ArgumentEntryRow key={String(item._id)} argument={item as unknown as Argument} subtitle={true} />
                  ))}
                  {section.key === 'questions' && section.items.map((item) => (
                    <QuestionEntryRow key={String(item._id)} question={item as unknown as Question} subtitle={true} />
                  ))}
                  {section.key === 'answers' && section.items.map((item) => (
                    <AnswerEntryRow key={String(item._id)} answer={item as unknown as Answer} subtitle={true} />
                  ))}
                  {section.key === 'issues' && section.items.map((item) => (
                    <IssueEntryRow key={String(item._id)} issue={item as unknown as Issue} subtitle={true} />
                  ))}
                  {section.key === 'opinions' && section.items.map((item) => (
                    <OpinionEntryRow key={String(item._id)} opinion={item as unknown as Opinion} subtitle={true} />
                  ))}
                  {section.key === 'artifacts' && section.items.map((item) => (
                    <li key={String(item._id)} className="list-group-item">
                      <Link to={`/artifacts/entry/${encodeURIComponent(String(item.friendlyUrl || item._id))}/${encodeURIComponent(String(item._id))}`}>
                        {String(item.title || '(Untitled)')}
                      </Link>
                    </li>
                  ))}
                </ul>
                {section.more && (
                  <div className="top-list-items-more">
                    <Link to={section.morePath} role="button" className="btn btn-default btn-sm">
                      <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ExplorePage;
