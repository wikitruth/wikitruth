import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import ArtifactEntryRow from '../components/EntryRow/ArtifactEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import PageMeta from '../components/common/PageMeta';
import { trackEvent } from '../utils/analytics';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import EmptyState from '../components/common/EmptyState';
import type { SearchResponse } from '../types/api';
import type { Answer, Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';
import type { LegacyEntity } from '../types/legacy';

type SearchTab = 'all' | 'topics' | 'arguments' | 'questions' | 'answers' | 'artifacts' | 'issues' | 'opinions';
type SearchContent = 'all' | 'wiki' | 'journal';
type SearchRelationship = 'any' | 'supports' | 'refutes' | 'qualifies' | 'background' | 'evidence' | 'source';
type SearchEvidence = 'all' | 'linked' | 'missing';

type SectionConfig = {
  key: Exclude<SearchTab, 'all'>;
  title: string;
  iconClass: string;
  moreFlag: keyof Pick<
    SearchResponse,
    'topicsMore' | 'argumentsMore' | 'questionsMore' | 'answersMore' | 'artifactsMore' | 'issuesMore' | 'opinionsMore'
  >;
};

const sectionConfigs: SectionConfig[] = [
  { key: 'topics', title: 'Topics', iconClass: 'fa-folder-open', moreFlag: 'topicsMore' },
  { key: 'arguments', title: 'Facts', iconClass: 'fa-flash', moreFlag: 'argumentsMore' },
  { key: 'questions', title: 'Questions', iconClass: 'fa-question-circle', moreFlag: 'questionsMore' },
  { key: 'answers', title: 'Answers', iconClass: 'fa-check-circle', moreFlag: 'answersMore' },
  { key: 'artifacts', title: 'Artifacts', iconClass: 'fa-puzzle-piece', moreFlag: 'artifactsMore' },
  { key: 'issues', title: 'Issues', iconClass: 'fa-exclamation-circle', moreFlag: 'issuesMore' },
  { key: 'opinions', title: 'Comments', iconClass: 'fa-comments-o', moreFlag: 'opinionsMore' },
];

const emptyResults: SearchResponse = {
  tab: 'all',
  content: 'all',
  results: false,
  topics: [],
  arguments: [],
  questions: [],
  answers: [],
  artifacts: [],
  issues: [],
  opinions: [],
};

function normalizeTab(value: string | null): SearchTab {
  const normalized = String(value || 'all').trim().toLowerCase();
  const valid: SearchTab[] = ['all', 'topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'];
  return valid.includes(normalized as SearchTab) ? (normalized as SearchTab) : 'all';
}

function normalizeContent(value: string | null): SearchContent {
  const normalized = String(value || 'all').trim().toLowerCase();
  if (normalized === 'diary') {
    return 'journal';
  }
  return normalized === 'wiki' || normalized === 'journal' ? (normalized as SearchContent) : 'all';
}

function normalizeRelationship(value: string | null): SearchRelationship {
  const normalized = String(value || 'any').trim().toLowerCase();
  const valid: SearchRelationship[] = ['any', 'supports', 'refutes', 'qualifies', 'background', 'evidence', 'source'];
  return valid.includes(normalized as SearchRelationship) ? normalized as SearchRelationship : 'any';
}

function normalizeEvidence(value: string | null): SearchEvidence {
  const normalized = String(value || 'all').trim().toLowerCase();
  return normalized === 'linked' || normalized === 'missing' ? normalized : 'all';
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const query = searchParams.get('q') || '';
  const tab = normalizeTab(searchParams.get('tab'));
  const content = normalizeContent(searchParams.get('content'));
  const relationship = normalizeRelationship(searchParams.get('relationship'));
  const evidence = normalizeEvidence(searchParams.get('evidence'));

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<SearchResponse>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { addToast } = useNotification();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  // Debounced auto-search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed === query) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('q', trimmed);
      if (tab !== 'all') params.set('tab', tab);
      if (content !== 'all') params.set('content', content);
      if (relationship !== 'any') params.set('relationship', relationship);
      if (evidence !== 'all') params.set('evidence', evidence);
      setSearchParams(params);
    }, 333);
    return () => clearTimeout(timer);
  }, [content, evidence, query, relationship, searchQuery, setSearchParams, tab]);

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [results]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(emptyResults);
      setSearched(false);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setSearched(true);
        const response = await apiService.search(query, { tab, content, relationship, evidence });
        trackEvent('search', 'engagement', query);
        setResults(response);
      } catch {
        addToast('danger', 'Search failed. Please try again.');
        setResults(emptyResults);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [addToast, query, tab, content, relationship, evidence]);

  const buildSearchLink = (next: { q?: string; tab?: SearchTab; content?: SearchContent }) => {
    const params = new URLSearchParams();
    const nextQuery = (typeof next.q === 'string' ? next.q : query).trim();
    const nextTab = next.tab || tab;
    const nextContent = next.content || content;

    if (nextQuery) {
      params.set('q', nextQuery);
    }
    if (nextTab !== 'all') {
      params.set('tab', nextTab);
    }
    if (nextContent !== 'all') {
      params.set('content', nextContent);
    }
    if (relationship !== 'any') params.set('relationship', relationship);
    if (evidence !== 'all') params.set('evidence', evidence);

    const queryString = params.toString();
    return queryString ? `/search?${queryString}` : '/search';
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    const params = new URLSearchParams();
    params.set('q', trimmed);
    if (tab !== 'all') {
      params.set('tab', tab);
    }
    if (content !== 'all') {
      params.set('content', content);
    }
    if (relationship !== 'any') params.set('relationship', relationship);
    if (evidence !== 'all') params.set('evidence', evidence);
    setSearchParams(params);
  };

  const handleContentChange = (nextContent: SearchContent) => {
    const params = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) {
      params.set('q', trimmed);
    }
    if (tab !== 'all') {
      params.set('tab', tab);
    }
    if (nextContent !== 'all') {
      params.set('content', nextContent);
    }
    if (relationship !== 'any') params.set('relationship', relationship);
    if (evidence !== 'all') params.set('evidence', evidence);
    setSearchParams(params);
  };

  const handleGraphFilterChange = (nextRelationship: SearchRelationship, nextEvidence: SearchEvidence) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (tab !== 'all') params.set('tab', tab);
    if (content !== 'all') params.set('content', content);
    if (nextRelationship !== 'any') params.set('relationship', nextRelationship);
    if (nextEvidence !== 'all') params.set('evidence', nextEvidence);
    setSearchParams(params);
  };

  const countBySection = {
    topics: results.topics?.length || 0,
    arguments: results.arguments?.length || 0,
    questions: results.questions?.length || 0,
    answers: results.answers?.length || 0,
    artifacts: results.artifacts?.length || 0,
    issues: results.issues?.length || 0,
    opinions: results.opinions?.length || 0,
  };

  const totalResults =
    countBySection.topics +
    countBySection.arguments +
    countBySection.questions +
    countBySection.answers +
    countBySection.artifacts +
    countBySection.issues +
    countBySection.opinions;

  const hasResults = Boolean(results.results || totalResults > 0);
  const activeSections = tab === 'all' ? sectionConfigs : sectionConfigs.filter((section) => section.key === tab);

  const getResultLinks = useCallback((): HTMLAnchorElement[] => {
    if (!resultsRef.current) return [];
    return Array.from(resultsRef.current.querySelectorAll('.wt-list .list-group-item:not(.highlight) a:first-child'));
  }, []);

  // Highlight and scroll to focused result
  useEffect(() => {
    if (!resultsRef.current) return;
    const items = resultsRef.current.querySelectorAll('.wt-list .list-group-item:not(.highlight)');
    items.forEach((item, i) => {
      if (i === focusedIndex) {
        item.classList.add('wt-result-focused');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('wt-result-focused');
      }
    });
  }, [focusedIndex, results]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setFocusedIndex(-1);
      return;
    }
    const links = getResultLinks();
    if (!links.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, links.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && links[focusedIndex]) {
      e.preventDefault();
      links[focusedIndex].click();
    }
  };

  const renderSectionRows = (section: SectionConfig, entries: LegacyEntity[]) => {
    switch (section.key) {
      case 'topics':
        return entries.map((topic) => <TopicEntryRow key={topic._id} topic={topic as unknown as Topic} subtitle={true} labels={true} />);
      case 'arguments':
        return entries.map((argument) => (
          <ArgumentEntryRow key={argument._id} argument={argument as unknown as Argument} subtitle={true} labels={true} />
        ));
      case 'questions':
        return entries.map((question) => (
          <QuestionEntryRow key={question._id} question={question as unknown as Question} subtitle={true} labels={true} />
        ));
      case 'answers':
        return entries.map((answer) => <AnswerEntryRow key={answer._id} answer={answer as unknown as Answer} subtitle={true} labels={true} />);
      case 'artifacts':
        return entries.map((artifact) => (
          <ArtifactEntryRow key={artifact._id} artifact={artifact as unknown as Artifact} subtitle={true} labels={true} />
        ));
      case 'issues':
        return entries.map((issue) => <IssueEntryRow key={issue._id} issue={issue as unknown as Issue} subtitle={true} labels={true} />);
      case 'opinions':
        return entries.map((opinion) => (
          <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={true} labels={true} />
        ));
      default:
        return null;
    }
  };

  return (
    <div>
      <PageMeta title="Search" description="Search Wikitruth content" />
      <h1 className="page-header wt-header">
        <i className="fa fa-search"></i> Search
      </h1>

      <form onSubmit={handleSubmit} className="wt-search">
        <div className="row">
          <div className="col-lg-6 col-md-8 col-sm-8">
            <div className="input-group">
              <input
                ref={searchInputRef}
                type="text"
                id="search"
                name="q"
                className="form-control"
                placeholder="Search for..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                role="combobox"
                aria-expanded={hasResults}
                aria-controls="search-results"
                aria-activedescendant={focusedIndex >= 0 ? `search-result-${focusedIndex}` : undefined}
              />
              <span className="input-group-btn">
                <button type="submit" className="btn btn-default">
                  Search
                </button>
              </span>
            </div>
            {user && (
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="radio-inline">
                  <input
                    type="radio"
                    name="content"
                    value="all"
                    checked={content === 'all'}
                    onChange={() => handleContentChange('all')}
                  />{' '}
                  All Content
                </label>
                <label className="radio-inline">
                  <input
                    type="radio"
                    name="content"
                    value="wiki"
                    checked={content === 'wiki'}
                    onChange={() => handleContentChange('wiki')}
                  />{' '}
                  Public Wiki
                </label>
                <label className="radio-inline">
                  <input
                    type="radio"
                    name="content"
                    value="journal"
                    checked={content === 'journal'}
                    onChange={() => handleContentChange('journal')}
                  />{' '}
                  My Journal
                </label>
              </div>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <div className="col-sm-6 form-group">
                <label htmlFor="search-relationship" className="control-label">Evidence relationship</label>
                <select
                  id="search-relationship"
                  className="form-control"
                  value={relationship}
                  disabled={evidence === 'missing'}
                  onChange={(event) => handleGraphFilterChange(event.target.value as SearchRelationship, evidence)}
                >
                  <option value="any">Any relationship</option>
                  <option value="supports">Supports</option>
                  <option value="refutes">Refutes</option>
                  <option value="qualifies">Qualifies</option>
                  <option value="background">Background</option>
                  <option value="evidence">Evidence</option>
                  <option value="source">Source</option>
                </select>
              </div>
              <div className="col-sm-6 form-group">
                <label htmlFor="search-evidence" className="control-label">Evidence state</label>
                <select
                  id="search-evidence"
                  className="form-control"
                  value={evidence}
                  onChange={(event) => {
                    const next = event.target.value as SearchEvidence;
                    handleGraphFilterChange(next === 'missing' ? 'any' : relationship, next);
                  }}
                >
                  <option value="all">All entries</option>
                  <option value="linked">Has linked evidence</option>
                  <option value="missing">Missing linked evidence</option>
                </select>
              </div>
            </div>
            {(relationship !== 'any' || evidence !== 'all') && (
              <p className="help-block">
                Graph filter active. Search ranking remains based on text relevance and recency.
              </p>
            )}
          </div>
        </div>
      </form>

      <br />

      {loading && <LoadingSpinner message="Searching..." />}

      {!loading && searched && (
        <div className="wt-search" ref={resultsRef} id="search-results" role="listbox">
          {!hasResults ? (
            <EmptyState
              icon="search"
              title={`No results found for "${query}"`}
              description="Try different keywords, check spelling, or use more general terms."
            />
          ) : (
            <>
              <ul className="nav nav-tabs wt-tabs" role="tablist">
                <li role="presentation" className={tab === 'all' ? 'active' : ''}>
                  <Link to={buildSearchLink({ tab: 'all' })} role="tab">
                    <i className="glyphicon glyphicon-globe" aria-hidden="true"></i> All ({totalResults})
                  </Link>
                </li>
                {sectionConfigs.map((section) => (
                  <li key={section.key} role="presentation" className={tab === section.key ? 'active' : ''}>
                    <Link to={buildSearchLink({ tab: section.key })} role="tab">
                      <i className={`fa ${section.iconClass}`} aria-hidden="true"></i>{' '}
                      <span className="hidden-xs">
                        {section.title} ({countBySection[section.key]})
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {activeSections.map((section) => {
                const entries = (results[section.key] || []) as LegacyEntity[];
                if (entries.length === 0) {
                  return null;
                }

                return (
                  <div key={section.key} className="wt-list-container">
                    <ul className="list-group top-list-items wt-list">
                      <li className="list-group-item highlight">
                        <i className={`fa ${section.iconClass} text-success-x`} aria-hidden="true"></i>
                        <div>{section.title}</div>
                      </li>
                      {renderSectionRows(section, entries)}
                    </ul>
                    {tab === 'all' && results[section.moreFlag] && (
                      <div className="top-list-items-more">
                        <Link to={buildSearchLink({ tab: section.key })} role="button" className="btn btn-default btn-sm">
                          <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
