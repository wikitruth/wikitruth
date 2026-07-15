import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import GroupNavigation from '../../../components/Groups/GroupNavigation';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import type { LegacyEntity } from '../../../types/legacy';
import type { Answer, Argument, Artifact, Issue, Opinion, Question, Topic } from '../../../types';
import TopicEntryRow from '../../../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../../../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../../../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../../../components/EntryRow/AnswerEntryRow';
import ArtifactEntryRow from '../../../components/EntryRow/ArtifactEntryRow';
import IssueEntryRow from '../../../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../../../components/EntryRow/OpinionEntryRow';

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
    { key: 'topics', title: 'Topics', icon: 'folder-open', entries: posts.topics || [] },
    { key: 'arguments', title: 'Arguments', icon: 'flash', entries: posts.arguments || [] },
    { key: 'questions', title: 'Questions', icon: 'question-circle', entries: posts.questions || [] },
    { key: 'issues', title: 'Issues', icon: 'exclamation-triangle', entries: posts.issues || [] },
    { key: 'opinions', title: 'Opinions', icon: 'comment', entries: posts.opinions || [] },
    { key: 'artifacts', title: 'Artifacts', icon: 'paperclip', entries: posts.artifacts || [] },
    { key: 'answers', title: 'Answers', icon: 'list-alt', entries: posts.answers || [] },
  ];

  const renderEntry = (kind: string, entry: LegacyEntity) => {
    switch (kind) {
      case 'topics':
        return <TopicEntryRow key={entry._id} topic={entry as unknown as Topic} subtitle={true} />;
      case 'arguments':
        return <ArgumentEntryRow key={entry._id} argument={entry as unknown as Argument} subtitle={true} />;
      case 'questions':
        return <QuestionEntryRow key={entry._id} question={entry as unknown as Question} subtitle={true} />;
      case 'issues':
        return <IssueEntryRow key={entry._id} issue={entry as unknown as Issue} subtitle={true} />;
      case 'opinions':
        return <OpinionEntryRow key={entry._id} opinion={entry as unknown as Opinion} subtitle={true} />;
      case 'artifacts':
        return <ArtifactEntryRow key={entry._id} artifact={entry as unknown as Artifact} subtitle={true} />;
      case 'answers':
        return <AnswerEntryRow key={entry._id} answer={entry as unknown as Answer} subtitle={true} />;
      default:
        return null;
    }
  };

  const visibleSections = activeTab === 'all' ? sections : sections.filter((section) => section.key === activeTab);

  const totalEntries = visibleSections.reduce((count, section) => count + section.entries.length, 0);

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Groups', url: '/groups' },
          { title: group.title, url: `/groups/${group.friendlyUrl || group._id}/${group._id}` },
          { title: 'Posts', active: true },
        ]}
      />
      <PageHeader
        title={`${group.title} Posts`}
        subtitle="Topics, arguments, questions, evidence, and discussion"
        icon="list-alt"
        iconColor="text-primary"
      />
      <GroupNavigation group={group} activeTab="posts" />

      <div className="form-group" style={{ marginTop: '20px', marginBottom: '20px' }}>
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
              <ul className="list-group wt-list" style={{ marginBottom: 0 }}>
                {section.entries.map((entry) => renderEntry(section.key, entry))}
              </ul>
            )}
          </div>
        </div>
      ))}

    </div>
  );
};

export default GroupPosts;
