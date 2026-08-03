import React, { useEffect, useId, useState } from 'react';
import apiService from '../../services/api';
import { useContentVisibility } from '../../context/ContentVisibilityContext';

interface TopicSearchResult {
  _id: string;
  title: string;
  friendlyUrl?: string;
}

interface TopicSearchProps {
  onSelect: (topic: TopicSearchResult) => void;
}

const TopicSearch: React.FC<TopicSearchProps> = ({ onSelect }) => {
  const resultsId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TopicSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { effectiveView } = useContentVisibility();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void apiService.searchOutlineTargets(trimmed, { types: 'topic', limit: 8, view: effectiveView })
        .then((response) => {
          if (!cancelled) setResults(response.results || []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [effectiveView, query]);

  const chooseTopic = (topic: TopicSearchResult) => {
    setQuery(topic.title);
    setOpen(false);
    onSelect(topic);
  };

  return (
    <div className="wt-viz-topic-search">
      <label htmlFor="wt-viz-topic-search-input" className="sr-only">Find a topic</label>
      <i className="fa fa-search wt-viz-topic-search-icon" aria-hidden="true"></i>
      <input
        id="wt-viz-topic-search-input"
        type="search"
        className="form-control"
        placeholder="Find a topic"
        value={query}
        autoComplete="off"
        aria-controls={resultsId}
        aria-expanded={open && query.trim().length >= 2}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter' && results.length === 1) {
            event.preventDefault();
            chooseTopic(results[0]);
          }
        }}
      />
      {query ? (
        <button
          type="button"
          className="wt-viz-topic-search-clear"
          onClick={() => {
            setQuery('');
            setResults([]);
          }}
          aria-label="Clear topic search"
        >
          <i className="fa fa-times" aria-hidden="true"></i>
        </button>
      ) : null}
      {open && query.trim().length >= 2 ? (
        <div id={resultsId} className="wt-viz-topic-results" role="listbox" aria-label="Topic search results">
          {loading ? <div className="wt-viz-topic-result-status">Searching…</div> : null}
          {!loading && results.length === 0 ? (
            <div className="wt-viz-topic-result-status">No matching topics</div>
          ) : null}
          {!loading && results.map((topic) => (
            <button
              key={topic._id}
              type="button"
              role="option"
              aria-selected="false"
              className="wt-viz-topic-result"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseTopic(topic)}
            >
              <i className="fa fa-folder-open" aria-hidden="true"></i>
              <span>{topic.title}</span>
              <i className="fa fa-arrow-right" aria-hidden="true"></i>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default TopicSearch;
