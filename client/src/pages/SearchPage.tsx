import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import { useAuth } from '../context/AuthContext';
import type { SearchResponse } from '../types/api';
import type { Answer, Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';
import type { LegacyEntity } from '../types/legacy';

type SearchTab = 'all' | 'topics' | 'arguments' | 'questions' | 'answers' | 'artifacts' | 'issues' | 'opinions';
type SearchContent = 'all' | 'wiki' | 'diary';

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
  { key: 'arguments', title: 'Arguments', iconClass: 'fa-flash', moreFlag: 'argumentsMore' },
  { key: 'questions', title: 'Questions', iconClass: 'fa-question-circle', moreFlag: 'questionsMore' },
  { key: 'answers', title: 'Answers', iconClass: 'fa-check-circle', moreFlag: 'answersMore' },
  { key: 'artifacts', title: 'Artifacts', iconClass: 'fa-puzzle-piece', moreFlag: 'artifactsMore' },
  { key: 'issues', title: 'Issues', iconClass: 'fa-exclamation-circle', moreFlag: 'issuesMore' },
  { key: 'opinions', title: 'Opinions', iconClass: 'fa-comments-o', moreFlag: 'opinionsMore' },
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
  return normalized === 'wiki' || normalized === 'diary' ? (normalized as SearchContent) : 'all';
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const query = searchParams.get('q') || '';
  const tab = normalizeTab(searchParams.get('tab'));
  const content = normalizeContent(searchParams.get('content'));

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<SearchResponse>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

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
        const response = await apiService.search(query, { tab: tab, content: content });
        setResults(response);
      } catch (error) {
        console.error('Error searching:', error);
        setResults(emptyResults);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [query, tab, content]);

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
          <li key={artifact._id} className="list-group-item">
            <a href={`/artifacts/entry/${(artifact as unknown as Artifact).friendlyUrl || artifact._id}/${artifact._id}`}>
              {artifact.title || '(Untitled)'}
            </a>
          </li>
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
      <h1 className="page-header wt-header">
        <i className="fa fa-search"></i> Search
      </h1>

      <form onSubmit={handleSubmit} className="wt-search">
        <div className="row">
          <div className="col-lg-6 col-md-8 col-sm-8">
            <div className="input-group">
              <input
                type="text"
                id="search"
                name="q"
                className="form-control"
                placeholder="Search for..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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
                    value="diary"
                    checked={content === 'diary'}
                    onChange={() => handleContentChange('diary')}
                  />{' '}
                  My Diary
                </label>
              </div>
            )}
          </div>
        </div>
      </form>

      <br />

      {loading && <LoadingSpinner message="Searching..." />}

      {!loading && searched && (
        <div className="wt-search">
          {!hasResults ? (
            <h4 style={{ fontWeight: 'normal' }} className="text-muted-x">
              No results found for <strong>{query}</strong>.
              <br />
              <br />
              <p>Suggestions:</p>
              <ul>
                <li>Make sure all words are spelled correctly.</li>
                <li>Try different keywords.</li>
                <li>Try more general keywords.</li>
                <li>Try fewer keywords.</li>
              </ul>
            </h4>
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
