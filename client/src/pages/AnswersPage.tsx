import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import apiService from '../services/api';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import Input from '../components/Form/Input';
import PageMeta from '../components/common/PageMeta';
import Select from '../components/Form/Select';
import ContentViewFilter, { type ViewMode } from '../components/common/ContentViewFilter';
import Alert from '../components/common/Alert';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import type { LegacyEntity } from '../types/legacy';
import type { Answer } from '../types';
import { useNotification } from '../context/NotificationContext';

const AnswersPage: React.FC = () => {
  const [answers, setAnswers] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('editDate');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('wt_view_mode');
    return (saved === 'wiki' || saved === 'original' || saved === 'archived') ? saved : 'all';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { addToast } = useNotification();
  const { user, activeRole } = useAuth();

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('wt_view_mode', mode);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiService.getAnswers(undefined, viewMode);
        setAnswers(result?.answers || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load answers';
        setError(msg);
        addToast('danger', msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addToast, viewMode]);

  // Filter and sort answers
  const filteredAndSortedAnswers = React.useMemo(() => {
    let filtered = answers;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (answer) =>
          answer.title?.toLowerCase().includes(query) ||
          answer.description?.toLowerCase().includes(query)
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
  }, [answers, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedAnswers.length / itemsPerPage);
  const paginatedAnswers = filteredAndSortedAnswers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingSpinner message="Loading answers..." />;
  }

  if (error) {
    return <Alert type="danger">Error loading answers: {error}</Alert>;
  }

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Answers', active: true },
  ];

  return (
    <div>
      <PageMeta title="Answers" description="Browse all answers in the knowledge base" />
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title="Answers"
        subtitle="Browse all answers in the knowledge base"
        icon="list-alt"
        iconColor="text-primary"
        actions={
          user && activeRole !== 'reader' ? (
            <Link to="/answers/create" className="btn btn-primary">
              <i className="fa fa-plus"></i> Add Answer
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
                placeholder="Search answers..."
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
            Found {filteredAndSortedAnswers.length} answer(s)
          </span>
        </div>
      )}

      {/* Answers list */}
      {paginatedAnswers.length > 0 ? (
        <>
          <ul className="list-group wt-list">
            <li className="list-group-item highlight">
              <span className="glyphicon glyphicon-list-alt text-primary" aria-hidden="true"></span>
              <div>
                Answers
                {filteredAndSortedAnswers.length > 0 && (
                  <span className="wt-label label label-default">{filteredAndSortedAnswers.length}</span>
                )}
              </div>
            </li>
            {paginatedAnswers.map((answer) => (
              <AnswerEntryRow key={answer._id} answer={answer as unknown as Answer} />
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
          icon="check-circle"
          title={searchQuery ? `No answers found matching "${searchQuery}"` : 'No answers found'}
          description="Try adjusting your search criteria."
        />
      )}
    </div>
  );
};

export default AnswersPage;
