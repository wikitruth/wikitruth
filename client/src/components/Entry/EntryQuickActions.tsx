import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import type { EntryReactionCounts, EntryReactionState, ReactionChannel, ReactionValue } from '../../types/api';
import type { LegacyEntity } from '../../types/legacy';

type SupportedObjectName = 'topic' | 'argument' | 'question' | 'answer' | 'issue' | 'opinion' | 'artifact';

interface EntryQuickActionsProps {
  entry: LegacyEntity;
  objectName?: SupportedObjectName;
  hasValue?: boolean;
  moreActions?: React.ReactNode;
}

function getTopicIdForReply(entry: LegacyEntity, objectName: string): string {
  if (objectName === 'topic') {
    return String(entry._id || '');
  }

  if (entry.ownerId) {
    return String(entry.ownerId);
  }

  if (entry.topicId) {
    return String(entry.topicId);
  }

  if (entry.parentTopic?._id) {
    return String(entry.parentTopic._id);
  }

  return '';
}

function getVisualizePath(entry: LegacyEntity, objectName: string): string | null {
  if (objectName === 'topic') {
    const id = encodeURIComponent(String(entry._id || ''));
    const friendly = encodeURIComponent(String(entry.friendlyUrl || entry._id || ''));
    return `/visualize/topic/${friendly}/${id}`;
  }

  if (entry.parentTopic?._id) {
    const id = encodeURIComponent(String(entry.parentTopic._id));
    const friendly = encodeURIComponent(String(entry.parentTopic.friendlyUrl || entry.parentTopic._id || ''));
    return `/visualize/topic/${friendly}/${id}`;
  }

  const ownerId = entry.ownerId ? String(entry.ownerId) : '';
  if (ownerId) {
    return `/visualize/topic/${encodeURIComponent(ownerId)}`;
  }

  return '/visualize';
}

function normalizeObjectName(value: unknown): SupportedObjectName {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw === 'topic' ||
    raw === 'argument' ||
    raw === 'question' ||
    raw === 'answer' ||
    raw === 'issue' ||
    raw === 'opinion' ||
    raw === 'artifact'
  ) {
    return raw;
  }
  return 'topic';
}

function createEmptyCounts(): EntryReactionCounts {
  return {
    exposure: {
      expose: 0,
      bury: 0,
    },
    vote: {
      upvote: 0,
      downvote: 0,
    },
    value: {
      good: 0,
      bad: 0,
    },
  };
}

function createEmptyState(): EntryReactionState {
  return {
    exposure: null,
    vote: null,
    value: null,
  };
}

function normalizeCounts(counts?: Partial<EntryReactionCounts>): EntryReactionCounts {
  return {
    exposure: {
      expose: Number(counts?.exposure?.expose || 0),
      bury: Number(counts?.exposure?.bury || 0),
    },
    vote: {
      upvote: Number(counts?.vote?.upvote || 0),
      downvote: Number(counts?.vote?.downvote || 0),
    },
    value: {
      good: Number(counts?.value?.good || 0),
      bad: Number(counts?.value?.bad || 0),
    },
  };
}

function normalizeState(state?: Partial<EntryReactionState>): EntryReactionState {
  return {
    exposure: state?.exposure === 'expose' || state?.exposure === 'bury' ? state.exposure : null,
    vote: state?.vote === 'upvote' || state?.vote === 'downvote' ? state.vote : null,
    value: state?.value === 'good' || state?.value === 'bad' ? state.value : null,
  };
}

function isReactionActive(
  state: EntryReactionState,
  channel: ReactionChannel,
  value: ReactionValue
): boolean {
  if (channel === 'exposure' && (value === 'expose' || value === 'bury')) {
    return state.exposure === value;
  }
  if (channel === 'vote' && (value === 'upvote' || value === 'downvote')) {
    return state.vote === value;
  }
  if (channel === 'value' && (value === 'good' || value === 'bad')) {
    return state.value === value;
  }
  return false;
}

function getReactionCount(counts: EntryReactionCounts, channel: ReactionChannel, value: ReactionValue): number {
  if (channel === 'exposure' && (value === 'expose' || value === 'bury')) {
    return counts.exposure[value];
  }
  if (channel === 'vote' && (value === 'upvote' || value === 'downvote')) {
    return counts.vote[value];
  }
  if (channel === 'value' && (value === 'good' || value === 'bad')) {
    return counts.value[value];
  }
  return 0;
}

const EntryQuickActions: React.FC<EntryQuickActionsProps> = ({
  entry,
  objectName: providedObjectName,
  hasValue,
  moreActions,
}) => {
  const { addToast } = useNotification();
  const { user } = useAuth();
  const objectName = normalizeObjectName(providedObjectName || entry.objectName);
  const entryId = String(entry._id || '');
  const topicIdForReply = getTopicIdForReply(entry, objectName);
  const replyPath = `/opinions/create?topicId=${encodeURIComponent(topicIdForReply)}&parentId=${encodeURIComponent(String(entry._id || ''))}`;
  const visualizePath = getVisualizePath(entry, objectName);
  const [counts, setCounts] = useState<EntryReactionCounts>(() => createEmptyCounts());
  const [myReactions, setMyReactions] = useState<EntryReactionState>(() => createEmptyState());
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const supportsValueReactions = useMemo(() => {
    const ethicalStatus = entry.ethicalStatus as { hasValue?: unknown } | undefined;
    return Boolean(hasValue || ethicalStatus?.hasValue);
  }, [entry.ethicalStatus, hasValue]);

  useEffect(() => {
    let mounted = true;

    async function loadReactions(): Promise<void> {
      if (!entryId) {
        if (mounted) {
          setCounts(createEmptyCounts());
          setMyReactions(createEmptyState());
        }
        return;
      }

      try {
        const result = await apiService.getEntryReactions({
          id: entryId,
          objectName,
        });
        if (!mounted) {
          return;
        }
        setCounts(normalizeCounts(result.counts));
        setMyReactions(normalizeState(result.myReactions));
      } catch (_error) {
        if (!mounted) {
          return;
        }
        setCounts(createEmptyCounts());
        setMyReactions(createEmptyState());
      }
    }

    void loadReactions();
    return () => {
      mounted = false;
    };
  }, [entryId, objectName]);

  const handleReaction = (channel: ReactionChannel, value: ReactionValue, label: string) => async (
    event: React.MouseEvent<HTMLAnchorElement>
  ) => {
    event.preventDefault();
    if (!entryId) {
      addToast('warning', 'This entry has no valid id for reactions.');
      return;
    }

    if (!user) {
      addToast('warning', 'Please sign in to react.');
      return;
    }

    const key = `${channel}:${value}`;
    if (pendingKey) {
      return;
    }
    setPendingKey(key);

    try {
      const result = await apiService.setEntryReaction({
        id: entryId,
        objectName,
        channel,
        value,
      });
      const nextCounts = normalizeCounts(result.counts);
      const nextState = normalizeState(result.myReactions);
      setCounts(nextCounts);
      setMyReactions(nextState);

      const activeAfterUpdate = isReactionActive(nextState, channel, value);
      addToast('success', activeAfterUpdate ? `${label} saved.` : `${label} removed.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update reaction';
      if (/auth|unauthorized|login|sign in/i.test(message)) {
        addToast('warning', 'Please sign in to react.');
      } else {
        addToast('danger', message);
      }
    } finally {
      setPendingKey(null);
    }
  };

  const renderReactionAction = (
    channel: ReactionChannel,
    value: ReactionValue,
    label: string,
    icon: string
  ) => {
    const key = `${channel}:${value}`;
    const active = isReactionActive(myReactions, channel, value);
    const count = getReactionCount(counts, channel, value);
    const isPending = pendingKey === key;

    return (
      <div className="pull-left entry-options" key={key}>
        <a
          className="text-muted no-underline"
          href="#"
          onClick={handleReaction(channel, value, label)}
          style={active ? { color: '#337ab7', fontWeight: 600 } : undefined}
          aria-pressed={active}
          aria-busy={isPending}
        >
          <i className={`fa ${icon}`} aria-hidden="true"></i> <span>{label}</span>
          {count > 0 ? (
            <span className="label label-default" style={{ marginLeft: '6px' }}>
              {count}
            </span>
          ) : null}
        </a>
      </div>
    );
  };

  return (
    <>
      <div className="wt-entry-options-container clearfix" style={{ marginTop: '6px' }}>
        <div className="pull-left entry-options">
          <Link className="text-muted no-underline" to={replyPath}>
            <i className="fa fa-reply" aria-hidden="true"></i> <span>Reply</span>
          </Link>
        </div>
        {renderReactionAction('exposure', 'expose', 'Expose', 'fa-arrow-circle-o-up')}
        {renderReactionAction('exposure', 'bury', 'Bury', 'fa-arrow-circle-o-down')}
        {renderReactionAction('vote', 'upvote', 'Upvote', 'fa-hand-o-up')}
        {renderReactionAction('vote', 'downvote', 'Downvote', 'fa-hand-o-down')}
        {supportsValueReactions ? renderReactionAction('value', 'good', 'Good', 'fa-thumbs-o-up') : null}
        {supportsValueReactions ? renderReactionAction('value', 'bad', 'Bad', 'fa-thumbs-o-down') : null}
        {visualizePath ? (
          <div className="pull-left entry-options">
            <Link className="text-muted no-underline" to={visualizePath}>
              <i className="fa fa-snowflake-o" aria-hidden="true"></i> <span>Visualize</span>
            </Link>
          </div>
        ) : null}
        {moreActions ? (
          <div className="pull-left entry-options">{moreActions}</div>
        ) : null}
      </div>
      <hr className="wt-dotted-line" style={{ marginBottom: '15px' }} />
    </>
  );
};

export default EntryQuickActions;
