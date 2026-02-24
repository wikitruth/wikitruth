import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import type { Topic } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import Input from '../components/Form/Input';
import Select from '../components/Form/Select';

interface TopicsApiResponse {
  topics?: Topic[];
  topic?: Topic | null;
}

const TopicsPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get('topic') || id;
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('editDate');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchTopics();
  }, [topicId]);

  const fetchTopics = async () => {
    try {
      const result = (await apiService.getTopics(topicId)) as TopicsApiResponse;
      setTopics(result.topics || []);
      setTopic(result.topic || null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setLoading(false);
    }
  };

  // Filter and sort topics
  const filteredAndSortedTopics = React.useMemo(() => {
    let filtered = topics;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
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
  }, [topics, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTopics.length / itemsPerPage);
  const paginatedTopics = filteredAndSortedTopics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingSpinner message="Loading topics..." />;
  }

  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Topics', active: true },
  ];

  if (topic) {
    breadcrumbItems[1].active = false;
    breadcrumbItems[1].url = '/topics';
    breadcrumbItems.push({ title: topic.title, active: true });
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title={topic?.title || 'Topics'}
        subtitle={topic?.description}
        icon="folder-open"
        iconColor="text-success-x"
        actions={
          <Link to="/topics/create" className="btn btn-success">
            <i className="fa fa-plus"></i> New Topic
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
                  setCurrentPage(1); // Reset to first page on search
                }}
                placeholder="Search topics..."
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
            Found {filteredAndSortedTopics.length} topic(s)
          </span>
        </div>
      )}

      {/* Topics list */}
      {paginatedTopics.length > 0 ? (
        <>
          <ul className="list-group wt-list">
            <li className="list-group-item highlight">
              <i className="fa fa-folder-open text-success-x" aria-hidden="true"></i>
              <div>
                Topics
                {filteredAndSortedTopics.length > 0 && (
                  <span className="wt-label label label-default">{filteredAndSortedTopics.length}</span>
                )}
              </div>
            </li>
            {paginatedTopics.map((t) => (
              <TopicEntryRow
                key={t._id}
                topic={t}
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
          {searchQuery ? `No topics found matching "${searchQuery}"` : 'No topics found.'}
        </div>
      )}
    </div>
  );
};

export default TopicsPage;
