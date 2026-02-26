import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import Input from '../components/Form/Input';
import Select from '../components/Form/Select';
import type { LegacyEntity } from '../types/legacy';
import type { Argument } from '../types';

const ArgumentsPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get('topic') || id;
  
  const [argumentsList, setArgumentsList] = useState<LegacyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('editDate');
  const [filterVerdict, setFilterVerdict] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchArguments();
  }, [topicId]);

  const fetchArguments = async () => {
    try {
      const result = await apiService.getArguments(topicId);
      setArgumentsList(result.arguments || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching arguments:', error);
      setLoading(false);
    }
  };

  // Filter and sort arguments
  const filteredAndSortedArguments = React.useMemo(() => {
    let filtered = argumentsList;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (arg) =>
          arg.title?.toLowerCase().includes(query) ||
          arg.description?.toLowerCase().includes(query)
      );
    }

    // Apply verdict filter
    if (filterVerdict !== 'all') {
      filtered = filtered.filter((arg) => {
        const verdict = arg.verdict?.result?.toLowerCase() || 'unknown';
        return verdict === filterVerdict;
      });
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
  }, [argumentsList, searchQuery, sortBy, filterVerdict]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedArguments.length / itemsPerPage);
  const paginatedArguments = filteredAndSortedArguments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingSpinner message="Loading arguments..." />;
  }

  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Arguments', active: true },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title="Arguments"
        icon="flash"
        iconColor="text-primary"
        actions={
          <Link to="/arguments/create" className="btn btn-primary">
            <i className="fa fa-plus"></i> New Argument
          </Link>
        }
      />

      {/* Search and Filter */}
      <div className="panel panel-default" style={{ marginBottom: '20px' }}>
        <div className="panel-body">
          <div className="row">
            <div className="col-md-6">
              <Input
                name="search"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search arguments..."
                className="input-lg"
              />
            </div>
            <div className="col-md-3">
              <Select
                name="verdict"
                value={filterVerdict}
                onChange={(e) => {
                  setFilterVerdict(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Verdicts' },
                  { value: 'true', label: 'True' },
                  { value: 'false', label: 'False' },
                  { value: 'unknown', label: 'Unknown' },
                  { value: 'mostly true', label: 'Mostly True' },
                  { value: 'mostly false', label: 'Mostly False' },
                ]}
                label="Filter by Verdict"
              />
            </div>
            <div className="col-md-3">
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
      {(searchQuery || filterVerdict !== 'all') && (
        <div style={{ marginBottom: '10px' }}>
          <span className="text-muted">
            Found {filteredAndSortedArguments.length} argument(s)
          </span>
        </div>
      )}

      {/* Arguments list */}
      {paginatedArguments.length > 0 ? (
        <>
          <ul className="list-group wt-list">
            <li className="list-group-item highlight text-primary">
              <span className="glyphicon glyphicon-flash" aria-hidden="true"></span>
              <div>
                Facts
                {filteredAndSortedArguments.length > 0 && (
                  <span className="wt-label label label-default">{filteredAndSortedArguments.length}</span>
                )}
              </div>
            </li>
            {paginatedArguments.map((argument) => (
              <ArgumentEntryRow
                key={argument._id}
                argument={argument as unknown as Argument}
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
        <div className="alert alert-info">
          {searchQuery || filterVerdict !== 'all'
            ? `No arguments found with current filters`
            : 'No arguments found.'}
        </div>
      )}
    </div>
  );
};

export default ArgumentsPage;
