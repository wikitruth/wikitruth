import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import type { LegacyEntity } from '../../../types/legacy';

const GroupPosts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [group, setGroup] = useState<LegacyEntity | null>(null);
  const [posts, setPosts] = useState<Record<string, LegacyEntity[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeTab = String(searchParams.get('tab') || 'all').trim().toLowerCase();

  useEffect(() => {
    const fetchGroupPosts = async () => {
      if (!id) {
        setError('Group ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = await apiService.getGroupPosts(id, 25);
        const groupModel = (result?.group || null) as LegacyEntity | null;
        const buckets = result?.posts || {};
        setGroup(groupModel);
        setPosts({
          topics: buckets.topics || [],
          arguments: buckets.arguments || [],
          questions: buckets.questions || [],
          issues: buckets.issues || [],
          opinions: buckets.opinions || [],
          artifacts: buckets.artifacts || [],
          answers: buckets.answers || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupPosts();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading group posts..." />;
  }

  if (error || !group) {
    return <Alert type="danger">{error || 'Group not found'}</Alert>;
  }

  const sections = [
    { key: 'topics', title: 'Topics', icon: 'folder-open', entries: posts.topics || [], to: (entry: LegacyEntity) => `/topics/entry/${entry.friendlyUrl}/${entry._id}` },
    { key: 'arguments', title: 'Arguments', icon: 'flash', entries: posts.arguments || [], to: (entry: LegacyEntity) => `/arguments/entry/${entry.friendlyUrl}/${entry._id}` },
    { key: 'questions', title: 'Questions', icon: 'question-circle', entries: posts.questions || [], to: (entry: LegacyEntity) => `/questions/entry/${entry.friendlyUrl}/${entry._id}` },
    { key: 'issues', title: 'Issues', icon: 'exclamation-triangle', entries: posts.issues || [], to: (entry: LegacyEntity) => `/issues/entry/${entry.friendlyUrl}/${entry._id}` },
    { key: 'opinions', title: 'Opinions', icon: 'comment', entries: posts.opinions || [], to: (entry: LegacyEntity) => `/opinions/entry/${entry.friendlyUrl}/${entry._id}` },
    { key: 'artifacts', title: 'Artifacts', icon: 'paperclip', entries: posts.artifacts || [], to: (entry: LegacyEntity) => `/artifacts/entry/${entry.friendlyUrl}/${entry._id}` },
    { key: 'answers', title: 'Answers', icon: 'list-alt', entries: posts.answers || [], to: (entry: LegacyEntity) => `/answers/entry/${entry._id}` },
  ];

  const visibleSections = activeTab === 'all' ? sections : sections.filter((section) => section.key === activeTab);

  const totalEntries = visibleSections.reduce((count, section) => count + section.entries.length, 0);

  return (
    <div className="container">
      <h2>{group.title} Posts</h2>
      <p className="text-muted">Unified group activity stream from the modern API.</p>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <Link to={`/topics/create?group=${group._id}`} className="btn btn-success">
          <i className="fa fa-plus"></i> New Topic
        </Link>{' '}
        <Link to={`/arguments/create?group=${group._id}`} className="btn btn-primary">
          <i className="fa fa-plus"></i> New Argument
        </Link>{' '}
        <Link to={`/questions/create?group=${group._id}`} className="btn btn-info">
          <i className="fa fa-plus"></i> New Question
        </Link>{' '}
        <a href={`/groups/${group._id}/posts`} className="btn btn-default" target="_blank" rel="noopener noreferrer">
          <i className="fa fa-external-link"></i> Compare Legacy
        </a>
      </div>

      {activeTab !== 'all' && (
        <div className="form-group">
          <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}/posts`} className="btn btn-link no-underline" style={{ paddingLeft: 0 }}>
            <i className="fa fa-list"></i> Show all activity
          </Link>
        </div>
      )}

      {totalEntries === 0 && (
        <Alert type="warning">No entries found for this group yet.</Alert>
      )}

      {visibleSections.map((section) => (
        <div key={section.key} className="panel panel-default">
          <div className="panel-heading">
            <h3 className="panel-title">
              <i className={`fa fa-${section.icon}`}></i> {section.title}{' '}
              <span className="label label-default">{section.entries.length}</span>
            </h3>
          </div>
          <div className="panel-body">
            {section.entries.length === 0 ? (
              <p className="text-muted" style={{ marginBottom: 0 }}>No {section.title.toLowerCase()} yet.</p>
            ) : (
              <ul className="list-group" style={{ marginBottom: 0 }}>
                {section.entries.map((entry) => (
                  <li key={entry._id} className="list-group-item">
                    <Link to={section.to(entry)}>{entry.title || '(Untitled)'}</Link>
                    {entry.editDate && (
                      <span className="text-muted pull-right">
                        {new Date(entry.editDate).toLocaleDateString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}

      <div style={{ marginTop: '20px' }}>
        <Link to={`/groups/${group.friendlyUrl || group._id}/${group._id}`} className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Group
        </Link>
      </div>
    </div>
  );
};

export default GroupPosts;
