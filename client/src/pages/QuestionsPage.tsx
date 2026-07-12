import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import Input from '../components/Form/Input';
import PageMeta from '../components/common/PageMeta';
import Select from '../components/Form/Select';
import ContentViewFilter, { type ViewMode } from '../components/common/ContentViewFilter';
import type { LegacyEntity } from '../types/legacy';
import type { Question } from '../types';
import { useNotification } from '../context/NotificationContext';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

const QuestionsPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get('topic') || id;
  
  const [questions, setQuestions] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('editDate');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('wt_view_mode');
    return (saved === 'wiki' || saved === 'original') ? saved : 'all';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { addToast } = useNotification();
  const { user, activeRole } = useAuth();

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('wt_view_mode', mode);
  };

  const fetchQuestions = useCallback(async () => {
    try {
      const result = await apiService.getQuestions(topicId, viewMode);
      setQuestions(result.questions || []);
      setLoading(false);
    } catch {
      addToast('danger', 'Failed to load questions');
      setLoading(false);
    }
  }, [addToast, topicId, viewMode]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  // Filter and sort questions
  const filteredAndSortedQuestions = React.useMemo(() => {
    let filtered = questions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title?.toLowerCase().includes(query) ||
          q.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'editDate':
          return new Date(b.editDate).getTime() - new Date(a.editDate).getTime();
        case 'createDate':
          return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [questions, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredAndSortedQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingSpinner message="Loading questions..." />;
  }

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Questions', active: true },
  ];

  return (
    <div>
      <PageMeta title="Questions" description="Browse questions from the community" />
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title="Questions"
        icon="question-circle"
        iconColor="text-success-x"
        actions={
          user && activeRole !== 'reader' ? (
            <Link to="/questions/create" className="btn btn-success">
              <i className="fa fa-plus"></i> Ask Question
            </Link>
          ) : undefined
        }
      />

      {/* Search and Filter */}
      <div className="panel panel-default" style={{ marginBottom: '20px' }}>
        <div className="panel-body">
          <div className="row">
            <div className="col-md-8">
              <Input
                name="search"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search questions..."
                className="input-lg"
              />
            </div>
            <div className="col-md-4">
              <Select
                name="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'editDate', label: 'Recently Updated' },
                  { value: 'createDate', label: 'Recently Created' },
                  { value: 'title', label: 'Title (A-Z)' },
                ]}
                label="Sort by"
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: '10px' }}>
            <div className="col-md-12">
              <ContentViewFilter value={viewMode} onChange={handleViewModeChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div style={{ marginBottom: '10px' }}>
          <span className="text-muted">
            Found {filteredAndSortedQuestions.length} question(s)
          </span>
        </div>
      )}

      {/* Questions list */}
      {paginatedQuestions.length > 0 ? (
        <>
          <ul className="list-group wt-list">
            <li className="list-group-item highlight">
              <span className="glyphicon glyphicon-question-sign text-success-x" aria-hidden="true"></span>
              <div>
                Questions
                {filteredAndSortedQuestions.length > 0 && (
                  <span className="wt-label label label-default">{filteredAndSortedQuestions.length}</span>
                )}
              </div>
            </li>
            {paginatedQuestions.map((question) => (
              <QuestionEntryRow
                key={question._id}
                question={question as unknown as Question}
                subtitle={true}
                labels={true}
              />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <EmptyState
          icon="question-circle"
          title={searchQuery ? `No questions found matching "${searchQuery}"` : 'No questions found'}
          description="Try adjusting your search criteria."
        />
      )}
    </div>
  );
};

export default QuestionsPage;
