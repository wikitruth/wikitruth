import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
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
import type { Issue } from '../types';
import { useNotification } from '../context/NotificationContext';
import { ContentVisibilityScope } from '../context/ContentVisibilityContext';
import { usePageContentVisibility } from '../hooks/usePageContentVisibility';

const IssuesPage: React.FC = () => {
  const [issues, setIssues] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('editDate');
  const { override: viewMode, effectiveView, defaultLabel, setOverride } = usePageContentVisibility();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { addToast } = useNotification();
  const { user, activeRole } = useAuth();

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getIssues(undefined, effectiveView);
      setIssues(data.issues || []);
    } catch {
      setError('Failed to load issues');
      addToast('danger', 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [addToast, effectiveView]);

  useEffect(() => {
    void fetchIssues();
  }, [fetchIssues]);

  // Filter and sort issues
  const filteredAndSortedIssues = React.useMemo(() => {
    let filtered = issues;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title?.toLowerCase().includes(query) ||
          issue.description?.toLowerCase().includes(query)
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
  }, [issues, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedIssues.length / itemsPerPage);
  const paginatedIssues = filteredAndSortedIssues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingSpinner message="Loading issues..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Issues', active: true },
  ];

  return (
    <ContentVisibilityScope view={effectiveView}><div>
      <PageMeta title="Issues" description="Browse issues and concerns raised by the community" />
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title="Issues"
        subtitle="Browse issues and concerns raised by the community"
        icon="exclamation-triangle"
        iconColor="text-warning"
        actions={
          user && activeRole !== 'reader' ? (
            <Link to="/issues/create" className="btn btn-warning">
              <i className="fa fa-plus"></i> Report Issue
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
                placeholder="Search issues..."
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
              <ContentViewFilter value={viewMode as ViewMode} onChange={setOverride} defaultLabel={defaultLabel} />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div style={{ marginBottom: '10px' }}>
          <span className="text-muted">
            Found {filteredAndSortedIssues.length} issue(s)
          </span>
        </div>
      )}

      {/* Issues list */}
      {paginatedIssues.length > 0 ? (
        <>
          <ul className="list-group wt-list">
            <li className="list-group-item highlight">
              <i className="fa fa-exclamation-triangle text-warning" aria-hidden="true"></i>
              <div>
                Issues
                {filteredAndSortedIssues.length > 0 && (
                  <span className="wt-label label label-default">{filteredAndSortedIssues.length}</span>
                )}
              </div>
            </li>
            {paginatedIssues.map((issue) => (
              <IssueEntryRow key={issue._id} issue={issue as unknown as Issue} subtitle={true} />
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
          icon="exclamation-circle"
          title={searchQuery ? `No issues found matching "${searchQuery}"` : 'No issues found'}
          description="Try adjusting your search criteria."
        />
      )}
    </div></ContentVisibilityScope>
  );
};

export default IssuesPage;
