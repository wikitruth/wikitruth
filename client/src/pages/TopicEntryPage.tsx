import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiService, { ApiRequestError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import EntryList from '../components/common/EntryList';
import Alert from '../components/common/Alert';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import ArtifactEntryRow from '../components/EntryRow/ArtifactEntryRow';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import EntryOutline from '../components/Entry/EntryOutline';
import TopicBranchContext from '../components/Entry/TopicBranchContext';
import TopicDetailsContent from '../components/Entry/TopicDetailsContent';
import PageMeta from '../components/common/PageMeta';
import type { TopicEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import type { Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';
import {
  EntryLifecycleNotices,
  EntryMetaBlock,
  buildLegacyEntryBreadcrumb,
} from '../components/Entry/EntryLegacyParity';
import TopicEntrySummary from '../components/Entry/TopicEntrySummary';
import TruthSummaryPanel from '../components/Entry/TruthSummaryPanel';
const CONTENT_COLLAPSE_THRESHOLD = 1200;
function getCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
function getTopicPath(topic: Partial<LegacyEntity>): string {
  const id = encodeURIComponent(String(topic._id || ''));
  const friendly = encodeURIComponent(String(topic.friendlyUrl || topic._id || ''));
  return `/topics/entry/${friendly}/${id}`;
}
const TopicEntryPage: React.FC = () => {
  const { id, friendlyUrl } = useParams<{ id: string; friendlyUrl?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<TopicEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);
  const [linkTitleDraft, setLinkTitleDraft] = useState('');
  const [linkMutationBusy, setLinkMutationBusy] = useState(false);
  const [linkMutationError, setLinkMutationError] = useState<string | null>(null);
  const [linkMutationSuccess, setLinkMutationSuccess] = useState<string | null>(null);

  const topicLinkId = String(searchParams.get('topicLink') || searchParams.get('id') || '').trim();
  const mode = String(searchParams.get('mode') || '').trim().toLowerCase();
  const isTopicLinkMode = Boolean(topicLinkId);
  const isTopicLinkEditMode = isTopicLinkMode && mode === 'edit-link';

  useEffect(() => {
    const fetchTopicEntry = async () => {
      if (!id) {
        setError('Topic id is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await apiService.getTopicEntry(id, {
          topicLink: topicLinkId || undefined,
          mode: mode || undefined,
          id: topicLinkId || undefined,
        });
        setData(result);
        const resolvedTopic = (result?.topic || {}) as Partial<LegacyEntity>;
        if (!isTopicLinkMode && resolvedTopic?._id && resolvedTopic?.friendlyUrl) {
          const canonicalPath = getTopicPath(resolvedTopic);
          const currentPath = window.location.pathname;
          if (currentPath !== canonicalPath) {
            navigate(canonicalPath, { replace: true });
          }
        }
      } catch (err) {
        const isPrimaryNotFound = err instanceof ApiRequestError && err.status === 404;
        if (isPrimaryNotFound && friendlyUrl) {
          try {
            const fallbackResult = await apiService.getTopicEntry(friendlyUrl, {
              topicLink: topicLinkId || undefined,
              mode: mode || undefined,
              id: topicLinkId || undefined,
            });
            setData(fallbackResult);
            const resolvedTopic = (fallbackResult?.topic || {}) as Partial<LegacyEntity>;
            if (!isTopicLinkMode && resolvedTopic?._id) {
              navigate(getTopicPath(resolvedTopic), { replace: true });
            }
            return;
          } catch (fallbackErr) {
            console.error('Fallback topic lookup failed:', fallbackErr);
          }
        }

        console.error('Error fetching topic entry:', err);
        if (err instanceof ApiRequestError) {
          setError(err.status === 404 ? 'Topic not found' : err.message || 'Failed to load topic');
        } else if (err instanceof Error) {
          setError(err.message || 'Failed to load topic');
        } else {
          setError('Failed to load topic');
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchTopicEntry();
  }, [friendlyUrl, id, isTopicLinkMode, mode, navigate, topicLinkId]);

  useEffect(() => {
    const entry = (data?.entry || null) as LegacyEntity | null;
    if (entry?.objectName === 'topicLink') {
      setLinkTitleDraft(String(entry.title || ''));
    } else {
      setLinkTitleDraft('');
    }
  }, [data?.entry]);

  const topic = (data?.topic || {}) as LegacyEntity;
  const entry = ((data?.entry || data?.topic || {}) as LegacyEntity);
  const topics = ((data?.topics || data?.topicChildren || []) as LegacyEntity[]).slice(0, 15);
  const keyTopics = ((data?.keyTopics || []) as LegacyEntity[]).slice(0, 6);
  const keyArguments = ((data?.keyArguments || []) as LegacyEntity[]).slice(0, 6);
  const siblingTopics = ((data?.topicSiblings || []) as LegacyEntity[]).slice(0, 6);
  const args = (data?.arguments || []) as LegacyEntity[];
  const questions = (data?.questions || []) as LegacyEntity[];
  const artifacts = (data?.artifacts || []) as LegacyEntity[];
  const issues = (data?.issues || []) as LegacyEntity[];
  const opinions = (data?.opinions || []) as LegacyEntity[];
  const topicLinks = (data?.topicLinks || []) as LegacyEntity[];
  const relatedParentTopic = (data?.parentTopic || topic.parentTopic || null) as LegacyEntity | null;
  const categories = (data?.categories || []) as LegacyEntity[];
  const isMainTopic = Boolean(data?.mainTopic);
  const tagLabels = Array.isArray(data?.tagLabels) ? (data?.tagLabels as LegacyEntity[]) : [];
  const entryObjectName = String(entry.objectName || topic.objectName || 'topic').trim() || 'topic';
  const isTopicLinkEntry = entryObjectName === 'topicLink';
  const quickActionObjectName = 'topic' as const;

  const breadcrumbItems = buildLegacyEntryBreadcrumb(topic, 'topic', {
    ancestorTopics: data?.topicAncestors,
    sectionTopic: (data?.parentTopic || null) as LegacyEntity | null,
    grandParentTopic: ((data as { grandParentTopic?: LegacyEntity } | null)?.grandParentTopic || null) as LegacyEntity | null,
  });

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: getTopicPath(topic),
    },
    {
      id: 'topics',
      title: 'Topics',
      icon: 'folder-open',
      url: `/topics/${encodeURIComponent(String(topic.friendlyUrl || ''))}/${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.topics?.accepted),
    },
    {
      id: 'arguments',
      title: 'Facts',
      icon: 'flash',
      url: `/arguments?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.arguments?.accepted),
    },
    {
      id: 'artifacts',
      title: 'Artifacts',
      icon: 'puzzle-piece',
      url: `/artifacts?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.artifacts?.accepted),
    },
    {
      id: 'questions',
      title: 'Questions',
      icon: 'question-circle',
      url: `/questions?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.questions?.accepted),
    },
    {
      id: 'issues',
      title: 'Issues',
      icon: 'exclamation-circle',
      url: `/issues?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.issues?.accepted),
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: 'comments-o',
      url: `/opinions?topic=${encodeURIComponent(String(topic._id || ''))}`,
      count: getCount(topic.childrenCount?.opinions?.accepted),
    },
  ].filter((tab) => tab.id === 'details' || Number(tab.count || 0) > 0);

  const content = String(topic.content || topic.description || '');
  const showSeeMore = content.length > CONTENT_COLLAPSE_THRESHOLD;
  const contentStyle = showSeeMore && !showFullContent
    ? { maxHeight: '450px', overflow: 'hidden', position: 'relative' as const }
    : undefined;

  const refreshTopicEntry = async () => {
    if (!id) {
      return;
    }
    const refreshed = await apiService.getTopicEntry(id, {
      topicLink: topicLinkId || undefined,
      mode: mode || undefined,
      id: topicLinkId || undefined,
    });
    setData(refreshed);
  };

  const handleUpdateTopicLink = async () => {
    if (!topicLinkId) {
      return;
    }
    try {
      setLinkMutationBusy(true);
      setLinkMutationError(null);
      setLinkMutationSuccess(null);
      await apiService.updateTopicLink(topicLinkId, { title: linkTitleDraft.trim() });
      await refreshTopicEntry();
      setLinkMutationSuccess('Link updated.');
    } catch (mutationError) {
      setLinkMutationError(mutationError instanceof Error ? mutationError.message : 'Failed to update link');
    } finally {
      setLinkMutationBusy(false);
    }
  };

  const handleDeleteTopicLink = async () => {
    if (!topicLinkId) {
      return;
    }
    if (!window.confirm('Delete this link? This action cannot be undone.')) {
      return;
    }
    try {
      setLinkMutationBusy(true);
      setLinkMutationError(null);
      setLinkMutationSuccess(null);
      await apiService.deleteTopicLink(topicLinkId);
      navigate('/topics');
    } catch (mutationError) {
      setLinkMutationError(mutationError instanceof Error ? mutationError.message : 'Failed to delete link');
      setLinkMutationBusy(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading topic..." />;
  }

  if (error || !data?.topic) {
    return <Alert type="danger">{error || 'Topic not found'}</Alert>;
  }

  return (
    <div>
      <PageMeta title={topic.title} description={topic.description || topic.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={topic.title || 'topic'} height={100} />

      <PageHeader
        title={String((isTopicLinkEntry ? entry.title2 || entry.title : topic.title) || topic.title)}
        subtitle={topic.subtitle}
        icon={isTopicLinkEntry ? 'link' : 'folder-open'}
        iconColor="text-success-x"
      />

      <TopicEntrySummary
        topic={topic}
        entry={entry}
        parentTopic={relatedParentTopic}
        tagLabels={tagLabels}
        verdict={data?.verdict}
        linkCount={data?.linkCount}
        isMainTopic={isMainTopic}
      />

      <EntryLifecycleNotices entry={topic} />

      <TruthSummaryPanel objectName="topic" objectId={String(topic._id || '')} />

      <EntryQuickActions
        entry={entry}
        objectName={quickActionObjectName}
        hasValue={Boolean(data?.hasValue)}
        moreActions={
          <EntryActionsMenu
            entry={entry}
            editPath={
              isTopicLinkEntry
                ? undefined
                : `/topics/create?id=${encodeURIComponent(String(topic._id || ''))}`
            }
          />
        }
      />

      {isTopicLinkEditMode && isTopicLinkEntry && (
        <div className="panel panel-default" style={{ marginTop: '12px' }}>
          <div className="panel-heading">
            <strong>Edit Link</strong>
          </div>
          <div className="panel-body">
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="topic-link-title">Contextual Title</label>
              <input
                id="topic-link-title"
                className="form-control"
                value={linkTitleDraft}
                onChange={(event) => setLinkTitleDraft(event.target.value)}
                placeholder="Optional contextual title"
                disabled={linkMutationBusy}
              />
            </div>
            {linkMutationError ? <Alert type="danger">{linkMutationError}</Alert> : null}
            {linkMutationSuccess ? <Alert type="success">{linkMutationSuccess}</Alert> : null}
            <div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleUpdateTopicLink}
                disabled={linkMutationBusy}
              >
                {linkMutationBusy ? 'Saving...' : 'Update'}
              </button>{' '}
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeleteTopicLink}
                disabled={linkMutationBusy}
              >
                Delete Link
              </button>
            </div>
          </div>
        </div>
      )}

      <PageTabs
        tabs={tabs}
        activeTab="details"
        variant="entry"
        singleItemMode="heading"
      />

      <TopicDetailsContent
        topic={topic}
        style={contentStyle}
        showSeeMore={showSeeMore}
        expanded={showFullContent}
        onExpand={() => setShowFullContent(true)}
      />

      <EntryOutline keyTopics={keyTopics} keyArguments={keyArguments} />

      <div className="wt-related" style={{ marginTop: '20px' }}>
        <span title="Related Topics">Topics</span>&nbsp;
        {relatedParentTopic && (
          <Link to={getTopicPath(relatedParentTopic)}>
            <span className="wt-label label label-default">{relatedParentTopic.title}</span>
          </Link>
        )}
        {topicLinks.map((link) => (
          <Link key={link._id} to={getTopicPath(link)}>
            <span className="wt-label label label-default">{link.title}</span>
          </Link>
        ))}
        {!relatedParentTopic && topicLinks.length === 0 && <span className="text-muted">No linked topics</span>}
      </div>

      <TopicBranchContext
        isMainTopic={isMainTopic}
        categories={categories}
        topics={topics}
        siblingTopics={siblingTopics}
      />

      {topics.length > 0 && (
        <EntryList
          title="Topics"
          icon="folder-open"
          iconColor="text-success-x"
          count={topic.childrenCount?.topics?.accepted ?? topics.length}
          moreUrl={(topic.childrenCount?.topics?.accepted ?? topics.length) > 15 ? `/topics/${topic.friendlyUrl}/${topic._id}` : undefined}
        >
          {topics.map((t) => (
            <TopicEntryRow key={t._id} topic={t as unknown as Topic} subtitle={false} />
          ))}
        </EntryList>
      )}

      {args.length > 0 && (
        <EntryList
          title="Facts"
          icon="flash"
          iconColor="text-primary"
          count={topic.childrenCount?.arguments?.accepted ?? args.length}
        >
          {args.map((arg) => (
            <ArgumentEntryRow key={arg._id} argument={arg as unknown as Argument} subtitle={false} />
          ))}
        </EntryList>
      )}

      {questions.length > 0 && (
        <EntryList
          title="Questions"
          icon="question-circle"
          iconColor="text-success-x"
          count={topic.childrenCount?.questions?.accepted ?? questions.length}
        >
          {questions.map((q) => (
            <QuestionEntryRow key={q._id} question={q as unknown as Question} subtitle={false} />
          ))}
        </EntryList>
      )}

      {artifacts.length > 0 && (
        <EntryList
          title="Artifacts"
          icon="paperclip"
          iconColor="text-muted"
          count={topic.childrenCount?.artifacts?.accepted ?? artifacts.length}
        >
          {artifacts.map((artifact) => (
            <ArtifactEntryRow key={artifact._id} artifact={artifact as unknown as Artifact} subtitle={true} labels={true} />
          ))}
        </EntryList>
      )}

      {issues.length > 0 && (
        <EntryList
          title="Issues"
          icon="exclamation-triangle"
          iconColor="text-warning"
          count={topic.childrenCount?.issues?.accepted ?? issues.length}
        >
          {issues.map((issue) => (
            <IssueEntryRow key={issue._id} issue={issue as unknown as Issue} subtitle={false} />
          ))}
        </EntryList>
      )}

      {opinions.length > 0 && (
        <EntryList
          title="Comments"
          icon="comment"
          iconColor="text-info"
          count={topic.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      <EntryMetaBlock entry={topic} showLifecycleNotices={false} />

      <div style={{ marginTop: '30px' }}>
        <Link to="/topics" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Topics
        </Link>
      </div>
    </div>
  );
};

export default TopicEntryPage;
