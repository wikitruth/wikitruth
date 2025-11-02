import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<any>({});
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
      const result = await apiService.search(q);
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
                       (results.questions?.length || 0);

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
            placeholder="Search topics, arguments, questions..."
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
                    {results.topics.map((topic: any) => (
                      <TopicEntryRow key={topic._id} topic={topic} subtitle={true} />
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
                    {results.arguments.map((argument: any) => (
                      <ArgumentEntryRow key={argument._id} argument={argument} subtitle={true} />
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
                    {results.questions.map((question: any) => (
                      <QuestionEntryRow key={question._id} question={question} subtitle={true} />
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
