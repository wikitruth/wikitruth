import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import Input from '../components/Form/Input';
import Select from '../components/Form/Select';
import Alert from '../components/common/Alert';
import type { LegacyEntity } from '../types/legacy';
import type { Opinion } from '../types';

const OpinionsPage: React.FC = () => {
  const [opinions, setOpinions] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('editDate');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchOpinions();
  }, []);

  const fetchOpinions = async () => {
    try {
      setLoading(true);
      const data = await apiService.getOpinions();
      setOpinions(data.opinions || []);
    } catch (err) {
      setError('Failed to load opinions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort opinions
  const filteredAndSortedOpinions = React.useMemo(() => {
    let filtered = opinions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (opinion) =>
          opinion.title?.toLowerCase().includes(query) ||
          opinion.description?.toLowerCase().includes(query)
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
  }, [opinions, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOpinions.length / itemsPerPage);
  const paginatedOpinions = filteredAndSortedOpinions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingSpinner message="Loading opinions..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Opinions', active: true },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title="Opinions"
        subtitle="Browse opinions and perspectives from the community"
        icon="comment"
        iconColor="text-info"
        actions={
          <Link to="/opinions/create" className="btn btn-info">
            <i className="fa fa-plus"></i> Share Opinion
          </Link>
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
                placeholder="Search opinions..."
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
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div style={{ marginBottom: '10px' }}>
          <span className="text-muted">
            Found {filteredAndSortedOpinions.length} opinion(s)
          </span>
        </div>
      )}

      {/* Opinions list */}
      {paginatedOpinions.length > 0 ? (
        <>
          <ul className="list-group wt-list">
            <li className="list-group-item highlight">
              <i className="fa fa-comment text-info" aria-hidden="true"></i>
              <div>
                Opinions
                {filteredAndSortedOpinions.length > 0 && (
                  <span className="wt-label label label-default">{filteredAndSortedOpinions.length}</span>
                )}
              </div>
            </li>
            {paginatedOpinions.map((opinion) => (
              <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={true} />
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
        <div className="alert alert-info">
          {searchQuery ? `No opinions found matching "${searchQuery}"` : 'No opinions found.'}
        </div>
      )}
    </div>
  );
};

export default OpinionsPage;
