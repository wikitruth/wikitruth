import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import type { LegacyResponse } from '../types/legacy';
import type { Answer, Argument, Issue, Opinion, Question, Topic, Artifact } from '../types';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<LegacyResponse>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    
    try {
      setLoading(true);
      setSearched(true);
      const result = (await apiService.search(q)) as LegacyResponse;
      setResults(result);
      setLoading(false);
    } catch (error) {
      console.error('Error searching:', error);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
    }
  };

  const totalResults = (results.topics?.length || 0) + 
                       (results.arguments?.length || 0) + 
                       (results.questions?.length || 0) +
                       (results.answers?.length || 0) +
                       (results.issues?.length || 0) +
                       (results.opinions?.length || 0) +
                       (results.artifacts?.length || 0);

  return (
    <div>
      <h1 className="page-header">
        <i className="fa fa-search"></i> Search
      </h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <div className="input-group input-group-lg">
          <input
            type="text"
            className="form-control"
            placeholder="Search topics, arguments, questions, answers, issues, opinions, artifacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="input-group-btn">
            <button className="btn btn-primary" type="submit">
              <i className="fa fa-search"></i> Search
            </button>
          </span>
        </div>
      </form>

      {loading && (
        <LoadingSpinner message="Searching..." />
      )}

      {!loading && searched && (
        <>
          {totalResults === 0 ? (
            <div className="alert alert-info">
              <i className="fa fa-info-circle"></i> No results found for "{query}"
            </div>
          ) : (
            <>
              <p className="text-muted">
                Found <strong>{totalResults}</strong> results for "{query}"
              </p>

              {/* Topics Results */}
              {results.topics && results.topics.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 className="page-header">
                    <i className="fa fa-folder-open"></i> Topics ({results.topics.length})
                  </h3>
                  <ul className="list-group wt-list">
                    {results.topics.map((topic) => (
                      <TopicEntryRow key={topic._id} topic={topic as unknown as Topic} subtitle={true} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Arguments Results */}
              {results.arguments && results.arguments.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 className="page-header">
                    <span className="glyphicon glyphicon-flash"></span> Arguments ({results.arguments.length})
                  </h3>
                  <ul className="list-group wt-list">
                    {results.arguments.map((argument) => (
                      <ArgumentEntryRow key={argument._id} argument={argument as unknown as Argument} subtitle={true} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions Results */}
              {results.questions && results.questions.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 className="page-header">
                    <span className="glyphicon glyphicon-question-sign"></span> Questions ({results.questions.length})
                  </h3>
                  <ul className="list-group wt-list">
                    {results.questions.map((question) => (
                      <QuestionEntryRow key={question._id} question={question as unknown as Question} subtitle={true} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Answers Results */}
              {results.answers && results.answers.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 className="page-header">
                    <span className="glyphicon glyphicon-ok-circle"></span> Answers ({results.answers.length})
                  </h3>
                  <ul className="list-group wt-list">
                    {results.answers.map((answer) => (
                      <AnswerEntryRow key={answer._id} answer={answer as unknown as Answer} subtitle={true} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Issues Results */}
              {results.issues && results.issues.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 className="page-header">
                    <span className="glyphicon glyphicon-warning-sign"></span> Issues ({results.issues.length})
                  </h3>
                  <ul className="list-group wt-list">
                    {results.issues.map((issue) => (
                      <IssueEntryRow key={issue._id} issue={issue as unknown as Issue} subtitle={true} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Opinions Results */}
              {results.opinions && results.opinions.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 className="page-header">
                    <span className="glyphicon glyphicon-comment"></span> Opinions ({results.opinions.length})
                  </h3>
                  <ul className="list-group wt-list">
                    {results.opinions.map((opinion) => (
                      <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={true} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Artifacts Results */}
              {results.artifacts && results.artifacts.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 className="page-header">
                    <span className="glyphicon glyphicon-paperclip"></span> Artifacts ({results.artifacts.length})
                  </h3>
                  <ul className="list-group wt-list">
                    {results.artifacts.map((artifact) => (
                      <li key={artifact._id} className="list-group-item">
                        <a href={`/artifacts/entry/${(artifact as unknown as Artifact).friendlyUrl}/${artifact._id}`}>
                          {artifact.title || '(Untitled)'}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
