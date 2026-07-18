import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import type { HomeDataResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Answer, Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import PageMeta from '../components/common/PageMeta';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import ArtifactEntryRow from '../components/EntryRow/ArtifactEntryRow';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import ContentViewFilter, { type ViewMode } from '../components/common/ContentViewFilter';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useApplicationContext } from '../context/ApplicationContext';
import { getTrustedRankingScore } from '../utils/trustedRanking';

type ExploreTab = 'all' | 'topics' | 'arguments' | 'questions' | 'answers' | 'artifacts' | 'issues' | 'opinions';

const EXPLORE_TABS: Array<{
  key: ExploreTab;
  icon: string;
  label: string;
  mobileLabelClass?: string;
}> = [
  { key: 'all', icon: 'globe', label: 'All' },
  { key: 'topics', icon: 'folder-open', label: 'Topics', mobileLabelClass: 'hidden-xxs' },
  { key: 'arguments', icon: 'flash', label: 'Facts', mobileLabelClass: 'hidden-xs' },
  { key: 'questions', icon: 'question-circle', label: 'Questions', mobileLabelClass: 'hidden-xs' },
  { key: 'answers', icon: 'check-circle', label: 'Answers', mobileLabelClass: 'hidden-xs' },
  { key: 'artifacts', icon: 'puzzle-piece', label: 'Artifacts', mobileLabelClass: 'hidden-xs' },
  { key: 'issues', icon: 'exclamation-circle', label: 'Issues', mobileLabelClass: 'hidden-xs' },
  { key: 'opinions', icon: 'comments-o', label: 'Comments', mobileLabelClass: 'hidden-xs' },
];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [data, setData] = useState<HomeDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const storedViewMode = (() => {
    const saved = localStorage.getItem('wt_view_mode');
    return saved === 'wiki' || saved === 'original' || saved === 'archived' ? saved : 'all';
  })();
  const activeTab = ((): ExploreTab => {
    const raw = String(searchParams.get('tab') || 'all').toLowerCase();
    if (raw === 'topics' || raw === 'arguments' || raw === 'questions' || raw === 'answers' || raw === 'artifacts' || raw === 'issues' || raw === 'opinions') {
      return raw;
    }
    return 'all';
  })();
  const viewMode: ViewMode = (() => {
    const raw = String(searchParams.get('view') || storedViewMode).toLowerCase();
    return raw === 'wiki' || raw === 'original' || raw === 'archived' ? raw : 'all';
  })();
  const keyword = String(searchParams.get('q') || '').trim();
  const screeningFilter = String(searchParams.get('screening') || 'all').trim();
  const verdictFilter = String(searchParams.get('status') || 'all').trim();
  const relationshipFilter = String(searchParams.get('relationship') || 'all').trim();
  const tagFilter = String(searchParams.get('tag') || '').trim();
  const sortValue = String(searchParams.get('sort') || 'latest').toLowerCase();
  const sortMode: 'latest' | 'popular' | 'trusted' = sortValue === 'popular' || sortValue === 'trusted' ? sortValue : 'latest';
  const { addToast } = useNotification();
  const { application, applicationPath } = useApplicationContext();
  const hasAdvancedFilters = Boolean(
    keyword || screeningFilter !== 'all' || verdictFilter !== 'all' || relationshipFilter !== 'all' || tagFilter
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(hasAdvancedFilters);
  const hideAcceptedStatus = viewMode === 'wiki';
  const visualizePath = applicationPath(
    application?.exploreTopicId
      ? `/visualize/topic/${encodeURIComponent(String(application.exploreTopicId))}`
      : '/visualize'
  );

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

  useEffect(() => {
    if (hasAdvancedFilters) {
      setAdvancedFiltersOpen(true);
    }
  }, [hasAdvancedFilters]);

  const handleViewModeChange = (mode: ViewMode) => {
    localStorage.setItem('wt_view_mode', mode);
    const next = new URLSearchParams(searchParams);
    next.delete('screening');
    if (mode === 'all') {
      next.delete('view');
    } else {
      next.set('view', mode);
    }
    setSearchParams(next);
  };

  const updateFilter = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (name === 'screening') {
      localStorage.setItem('wt_view_mode', 'all');
      next.delete('view');
    }
    if (!value || value === 'all') {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    setSearchParams(next);
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

  const filterEntry = useCallback((entry: LegacyEntity): boolean => {
    if (keyword) {
      const text = `${String(entry.title || '')} ${String(entry.content || '')} ${String(entry.contentPreview || '')}`.toLowerCase();
      if (!text.includes(keyword.toLowerCase())) {
        return false;
      }
    }

    if (screeningFilter !== 'all') {
      const status = Number(entry.screening?.status);
      if (!Number.isFinite(status) || String(status) !== screeningFilter) {
        return false;
      }
    }

    if (viewMode !== 'all') {
      const expectedStatus = viewMode === 'wiki' ? 1 : viewMode === 'original' ? 0 : 3;
      if (Number(entry.screening?.status) !== expectedStatus) {
        return false;
      }
    }

    if (verdictFilter !== 'all') {
      const verdictStatus = Number((entry.verdict as { status?: number } | undefined)?.status);
      if (verdictFilter === 'verified' && verdictStatus !== 1) {
        return false;
      }
      if (verdictFilter === 'false' && verdictStatus !== 2) {
        return false;
      }
      if (verdictFilter === 'pending' && verdictStatus !== 0) {
        return false;
      }
    }

    if (relationshipFilter === 'root-only' && entry.parentId) {
      return false;
    }
    if (relationshipFilter === 'with-issues') {
      const issuesCount = Number(entry.childrenCount?.issues?.accepted || entry.childrenCount?.issues?.total || 0);
      if (issuesCount <= 0) {
        return false;
      }
    }
    if (relationshipFilter === 'with-discussion') {
      const discussionCount = Number(entry.childrenCount?.opinions?.accepted || entry.childrenCount?.opinions?.total || 0);
      if (discussionCount <= 0) {
        return false;
      }
    }

    if (tagFilter) {
      const rawTags = Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag)) : [];
      const extrasTags = Array.isArray((entry.extras as { tags?: unknown[] } | undefined)?.tags)
        ? ((entry.extras as { tags?: unknown[] }).tags || []).map((tag) => String(tag))
        : [];
      const merged = `${rawTags.join(' ')} ${extrasTags.join(' ')}`.toLowerCase();
      if (!merged.includes(tagFilter.toLowerCase())) {
        return false;
      }
    }

    return true;
  }, [keyword, relationshipFilter, screeningFilter, tagFilter, verdictFilter, viewMode]);

  const filteredSections = useMemo(() => {
    const getPopularityScore = (entry: LegacyEntity): number => {
      const buckets = entry.childrenCount || {};
      const totals = [
        buckets.topics?.accepted || buckets.topics?.total || 0,
        buckets.arguments?.accepted || buckets.arguments?.total || 0,
        buckets.questions?.accepted || buckets.questions?.total || 0,
        buckets.answers?.accepted || buckets.answers?.total || 0,
        buckets.artifacts?.accepted || buckets.artifacts?.total || 0,
        buckets.issues?.accepted || buckets.issues?.total || 0,
        buckets.opinions?.accepted || buckets.opinions?.total || 0,
      ]
        .map((value) => Number(value || 0))
        .reduce((sum, value) => sum + value, 0);
      const points = Number(entry.points || 0);
      const verdict = Number((entry.verdict as { status?: number } | undefined)?.status || 0);
      const verdictBoost = verdict === 1 ? 5 : 0;
      return totals + points + verdictBoost;
    };

    const sortEntries = (items: LegacyEntity[]): LegacyEntity[] => {
      return [...items].sort((left, right) => {
        if (sortMode === 'popular') {
          const scoreDelta = getPopularityScore(right) - getPopularityScore(left);
          if (scoreDelta !== 0) {
            return scoreDelta;
          }
        }
        if (sortMode === 'trusted') {
          const trustedDelta = getTrustedRankingScore(right, getPopularityScore(right))
            - getTrustedRankingScore(left, getPopularityScore(left));
          if (trustedDelta !== 0) return trustedDelta;
        }

        const leftDate = new Date(left.editDate || left.createDate || 0).getTime();
        const rightDate = new Date(right.editDate || right.createDate || 0).getTime();
        return rightDate - leftDate;
      });
    };

    return sections.map((section) => ({
      ...section,
      items: sortEntries((section.items || []).filter((entry) => filterEntry(entry as LegacyEntity))),
    }));
  }, [filterEntry, sections, sortMode]);

  const categories: ExploreCategory[] = (data?.appCategories || []) as ExploreCategory[];

  if (loading) {
    return <LoadingSpinner message="Loading explore..." />;
  }

  return (
    <div>
      <PageMeta title="Explore" description="Discover categories and latest posts" />
      <h1 className="page-header wt-header-2 wt-explore-page-header">
        <i className="fa fa-globe text-muted-x" aria-hidden="true"></i> Explore
        <span className="pull-right wt-explore-header-actions">
          <a href="#browse" aria-label="Jump to latest posts" title="Jump to latest posts">
            <i className="fa fa-arrow-down" aria-hidden="true"></i>
          </a>
          <Link to={visualizePath} aria-label="Visualize" title="Visualize">
            <i className="fa fa-snowflake-o" aria-hidden="true"></i>
          </Link>
        </span>
      </h1>

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
        <div className="btn-group" role="group" aria-label="Latest or Popular Filter" style={{ marginBottom: 5 }}>
          <a
            href="#browse"
            className={`btn btn-${sortMode === 'latest' ? 'info' : 'default'} btn-sm`}
            role="button"
            onClick={(event) => {
              event.preventDefault();
              updateFilter('sort', '');
            }}
          >
            Latest
          </a>
          <a
            href="#browse"
            className={`btn btn-${sortMode === 'popular' ? 'info' : 'default'} btn-sm`}
            role="button"
            onClick={(event) => {
              event.preventDefault();
              updateFilter('sort', 'popular');
            }}
          >
            Popular
          </a>
          <a
            href="#browse"
            className={`btn btn-${sortMode === 'trusted' ? 'info' : 'default'} btn-sm`}
            role="button"
            title="Rank accepted content using the contributor scorecard as one transparent input"
            onClick={(event) => {
              event.preventDefault();
              updateFilter('sort', 'trusted');
            }}
          >
            Trusted
          </a>
        </div>
        &nbsp;&nbsp;
        <ContentViewFilter value={viewMode} onChange={handleViewModeChange} />
      </div>
      <button
        type="button"
        className="btn btn-default btn-sm visible-xs wt-explore-filter-toggle"
        aria-expanded={advancedFiltersOpen}
        aria-controls="explore-advanced-filters"
        onClick={() => setAdvancedFiltersOpen((open) => !open)}
      >
        <i className="fa fa-sliders" aria-hidden="true"></i>{' '}
        {advancedFiltersOpen ? 'Hide advanced filters' : 'Advanced filters'}
        {hasAdvancedFilters ? <span className="badge">Active</span> : null}
      </button>
      <div
        id="explore-advanced-filters"
        className={`panel panel-default wt-explore-advanced-filters${advancedFiltersOpen ? ' is-open' : ''}`}
      >
        <div className="panel-body">
          <div className="row">
            <div className="col-sm-3">
              <label htmlFor="explore-filter-q">Keyword</label>
              <input
                id="explore-filter-q"
                className="form-control"
                value={keyword}
                onChange={(event) => updateFilter('q', event.target.value)}
                placeholder="Search title/content"
              />
            </div>
            <div className="col-sm-2">
              <label htmlFor="explore-filter-screening">Screening</label>
              <select
                id="explore-filter-screening"
                className="form-control"
                value={screeningFilter}
                onChange={(event) => updateFilter('screening', event.target.value)}
              >
                <option value="all">All</option>
                <option value="1">Accepted</option>
                <option value="0">Pending</option>
                <option value="2">Rejected</option>
                <option value="3">Archived</option>
              </select>
            </div>
            <div className="col-sm-2">
              <label htmlFor="explore-filter-status">Status</label>
              <select
                id="explore-filter-status"
                className="form-control"
                value={verdictFilter}
                onChange={(event) => updateFilter('status', event.target.value)}
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="false">False</option>
              </select>
            </div>
            <div className="col-sm-3">
              <label htmlFor="explore-filter-relationship">Relationship</label>
              <select
                id="explore-filter-relationship"
                className="form-control"
                value={relationshipFilter}
                onChange={(event) => updateFilter('relationship', event.target.value)}
              >
                <option value="all">All</option>
                <option value="root-only">Root only</option>
                <option value="with-issues">With issues</option>
                <option value="with-discussion">With discussion</option>
              </select>
            </div>
            <div className="col-sm-2">
              <label htmlFor="explore-filter-tag">Tag</label>
              <input
                id="explore-filter-tag"
                className="form-control"
                value={tagFilter}
                onChange={(event) => updateFilter('tag', event.target.value)}
                placeholder="Tag id/name"
              />
            </div>
          </div>
          <p className="text-muted" style={{ marginTop: 8, marginBottom: 0 }}>
            Filters are URL-shareable.
          </p>
        </div>
      </div>

      <ul className="nav nav-tabs wt-tabs wt-explore-tabs" role="tablist">
        {EXPLORE_TABS.map((tab) => (
          <li key={tab.key} role="presentation" className={activeTab === tab.key ? 'active' : ''}>
            <a
              href="#browse"
              role="tab"
              aria-label={tab.label}
              onClick={(event) => {
                event.preventDefault();
                updateFilter('tab', tab.key === 'all' ? '' : tab.key);
              }}
            >
              <i className={`fa fa-${tab.icon}`} aria-hidden="true"></i>{' '}
              <span className={tab.mobileLabelClass}>{tab.label}</span>
            </a>
          </li>
        ))}
        {Boolean(user?.roles?.admin) && (
          <li role="presentation" className="dropdown">
            <a
              href="#browse"
              id="explore-tab-more"
              className="dropdown-toggle"
              data-toggle="dropdown"
              aria-controls="explore-tab-more-contents"
              aria-expanded="false"
              onClick={(event) => event.preventDefault()}
            >
              <span className="glyphicon glyphicon-option-horizontal" aria-hidden="true"></span>
            </a>
            <ul className="dropdown-menu dropdown-menu-right" aria-labelledby="explore-tab-more" id="explore-tab-more-contents">
              <li role="tab">
                <Link to="/topics/create">
                  <span className="glyphicon glyphicon-edit" aria-hidden="true"></span> New Topic
                </Link>
              </li>
            </ul>
          </li>
        )}
      </ul>

      <div>
        {filteredSections
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
                    <TopicEntryRow key={String(item._id)} topic={item as unknown as Topic} subtitle={true} hideAcceptedStatus={hideAcceptedStatus} />
                  ))}
                  {section.key === 'arguments' && section.items.map((item) => (
                    <ArgumentEntryRow key={String(item._id)} argument={item as unknown as Argument} subtitle={true} hideAcceptedStatus={hideAcceptedStatus} />
                  ))}
                  {section.key === 'questions' && section.items.map((item) => (
                    <QuestionEntryRow key={String(item._id)} question={item as unknown as Question} subtitle={true} hideAcceptedStatus={hideAcceptedStatus} />
                  ))}
                  {section.key === 'answers' && section.items.map((item) => (
                    <AnswerEntryRow key={String(item._id)} answer={item as unknown as Answer} subtitle={true} hideAcceptedStatus={hideAcceptedStatus} />
                  ))}
                  {section.key === 'issues' && section.items.map((item) => (
                    <IssueEntryRow key={String(item._id)} issue={item as unknown as Issue} subtitle={true} hideAcceptedStatus={hideAcceptedStatus} />
                  ))}
                  {section.key === 'opinions' && section.items.map((item) => (
                    <OpinionEntryRow key={String(item._id)} opinion={item as unknown as Opinion} subtitle={true} hideAcceptedStatus={hideAcceptedStatus} />
                  ))}
                  {section.key === 'artifacts' && section.items.map((item) => (
                    <ArtifactEntryRow key={String(item._id)} artifact={item as unknown as Artifact} subtitle={true} hideAcceptedStatus={hideAcceptedStatus} />
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
