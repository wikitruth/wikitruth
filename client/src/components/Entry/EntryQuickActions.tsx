import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import type { EntryReactionCounts, EntryReactionState, ReactionChannel, ReactionValue } from '../../types/api';
import type { LegacyEntity } from '../../types/legacy';
import ContextualContributionDrawer from './ContextualContributionDrawer';

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
  const visualizePath = getVisualizePath(entry, objectName);
  const [counts, setCounts] = useState<EntryReactionCounts>(() => createEmptyCounts());
  const [myReactions, setMyReactions] = useState<EntryReactionState>(() => createEmptyState());
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [showReplyMenu, setShowReplyMenu] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showContributionDrawer, setShowContributionDrawer] = useState(false);
  const [editTitle, setEditTitle] = useState(String(entry.title || ''));
  const [editContent, setEditContent] = useState(String(entry.content || ''));
  const [isSubmittingInlineAction, setIsSubmittingInlineAction] = useState(false);

  const supportsValueReactions = useMemo(() => {
    const ethicalStatus = entry.ethicalStatus as { hasValue?: unknown } | undefined;
    return Boolean(hasValue || ethicalStatus?.hasValue);
  }, [entry.ethicalStatus, hasValue]);

  const canQuickEdit = useMemo(() => {
    if (!user) {
      return false;
    }
    if (user.roles?.admin) {
      return true;
    }
    const actor = user as unknown as { _id?: string; id?: string };
    const actorId = String(actor._id || actor.id || '');
    return Boolean(actorId && actorId === String(entry.createUserId || ''));
  }, [entry.createUserId, user]);

  const replyMenuItems = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      iconClass: string;
      to: string;
      dividerBefore?: boolean;
    }> = [];

    const encodeCurrentContext = (basePath: string) =>
      `${basePath}?${encodeURIComponent(objectName)}=${encodeURIComponent(entryId)}`;
    const createTopicId = encodeURIComponent(topicIdForReply || entryId);
    const hasQuestionContext = Boolean(entry.parentQuestion?._id) || objectName === 'question';

    if (objectName !== 'issue' && objectName !== 'opinion') {
      if (!hasQuestionContext) {
        if (objectName !== 'argument') {
          items.push({
            key: 'new-topic',
            label: 'New Topic',
            iconClass: 'glyphicon glyphicon-edit',
            to: `/topics/create?topic=${createTopicId}`,
          });
        }
        items.push(
          {
            key: 'new-fact',
            label: 'New Fact',
            iconClass: 'glyphicon glyphicon-flash',
            to: encodeCurrentContext('/arguments/create'),
          },
          {
            key: 'new-question',
            label: 'New Question',
            iconClass: 'fa fa-question-circle',
            to: encodeCurrentContext('/questions/create'),
          },
          {
            key: 'new-artifact',
            label: 'New Artifact',
            iconClass: 'fa fa-puzzle-piece',
            to: encodeCurrentContext('/artifacts/create'),
          },
          {
            key: 'new-issue',
            label: 'New Issue',
            iconClass: 'fa fa-exclamation-circle',
            to: encodeCurrentContext('/issues/create'),
            dividerBefore: true,
          },
        );
      } else if (objectName !== 'answer') {
        items.push(
          {
            key: 'new-answer',
            label: 'New Answer',
            iconClass: 'fa fa-question-circle',
            to: encodeCurrentContext('/answers/create'),
          },
          {
            key: 'new-issue',
            label: 'New Issue',
            iconClass: 'fa fa-exclamation-circle',
            to: encodeCurrentContext('/issues/create'),
            dividerBefore: true,
          },
        );
      } else {
        items.push({
          key: 'new-issue',
          label: 'New Issue',
          iconClass: 'fa fa-exclamation-circle',
          to: encodeCurrentContext('/issues/create'),
        });
      }
    }

    items.push({
      key: 'new-comment',
      label: 'New Comment',
      iconClass: 'fa fa-comments-o',
      to: encodeCurrentContext('/opinions/create'),
      dividerBefore: items.length > 0 && !items[items.length - 1].dividerBefore,
    });

    return items;
  }, [objectName, entryId, topicIdForReply, entry.parentQuestion?._id]);

  useEffect(() => {
    setEditTitle(String(entry.title || ''));
    setEditContent(String(entry.content || ''));
  }, [entry.title, entry.content, entry._id]);

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

  const submitQuickEdit = async (): Promise<void> => {
    if (!canQuickEdit) {
      addToast('warning', 'You are not allowed to edit this entry.');
      return;
    }
    if (editTitle.trim().length < 3 || editContent.trim().length < 10) {
      addToast('warning', 'Title/content is too short.');
      return;
    }

    setIsSubmittingInlineAction(true);
    try {
      switch (objectName) {
        case 'topic':
          await apiService.updateTopic(entryId, { title: editTitle.trim(), description: editContent.trim() });
          break;
        case 'argument':
          await apiService.updateArgument(entryId, { title: editTitle.trim(), description: editContent.trim() });
          break;
        case 'question':
          await apiService.updateQuestion(entryId, { title: editTitle.trim(), description: editContent.trim() });
          break;
        case 'issue':
          await apiService.updateIssue(entryId, { title: editTitle.trim(), description: editContent.trim() });
          break;
        case 'opinion':
          await apiService.updateOpinion(entryId, { title: editTitle.trim(), description: editContent.trim() });
          break;
        case 'answer':
          await apiService.updateAnswer(entryId, { title: editTitle.trim(), description: editContent.trim() });
          break;
        case 'artifact':
          await apiService.updateArtifact(entryId, { title: editTitle.trim(), description: editContent.trim() });
          break;
        default:
          throw new Error('Quick edit is not supported for this entry type');
      }
      addToast('success', 'Entry updated.');
      setShowQuickEdit(false);
      window.location.reload();
    } catch (error) {
      addToast('danger', error instanceof Error ? error.message : 'Unable to update entry');
    } finally {
      setIsSubmittingInlineAction(false);
    }
  };

  return (
    <>
      <div className="wt-entry-options-container clearfix" style={{ marginTop: '6px' }}>
        <div className={`dropdown pull-left entry-options ${showReplyMenu ? 'open' : ''}`}>
          <a
            href="#"
            className="text-muted no-underline dropdown-toggle"
            aria-haspopup="true"
            aria-expanded={showReplyMenu}
            onClick={(event) => {
              event.preventDefault();
              setShowReplyMenu((value) => !value);
              setShowQuickEdit(false);
              setShowContributionDrawer(false);
            }}
            onBlur={() => {
              window.setTimeout(() => setShowReplyMenu(false), 120);
            }}
          >
            <i className="fa fa-reply" aria-hidden="true"></i> <span>Reply</span>
          </a>
          {showReplyMenu ? (
            <ul className="dropdown-menu dropdown-menu-right-x">
              <li className="dropdown-header">Reply With...</li>
              <li>
                <button
                  type="button"
                  className="btn btn-link"
                  style={{ width: '100%', textAlign: 'left', color: '#333', padding: '3px 20px' }}
                  onClick={() => { setShowReplyMenu(false); setShowContributionDrawer(true); }}
                >
                  <i className="fa fa-bolt" aria-hidden="true"></i> Quick Contribution
                </button>
              </li>
              <li role="separator" className="divider"></li>
              {replyMenuItems.map((item) => (
                <React.Fragment key={item.key}>
                  {item.dividerBefore ? <li role="separator" className="divider"></li> : null}
                  <li>
                    <Link
                      to={item.to}
                      onClick={() => {
                        setShowReplyMenu(false);
                      }}
                    >
                      <span className={item.iconClass} aria-hidden="true"></span> {item.label}
                    </Link>
                  </li>
                </React.Fragment>
              ))}
            </ul>
          ) : null}
        </div>
        {renderReactionAction('exposure', 'expose', 'Expose', 'fa-arrow-circle-o-up')}
        {renderReactionAction('exposure', 'bury', 'Bury', 'fa-arrow-circle-o-down')}
        {supportsValueReactions ? renderReactionAction('value', 'good', 'Good', 'fa-thumbs-o-up') : null}
        {supportsValueReactions ? renderReactionAction('value', 'bad', 'Bad', 'fa-thumbs-o-down') : null}
        {visualizePath ? (
          <div className="pull-left entry-options">
            <Link className="text-muted no-underline" to={visualizePath}>
              <i className="fa fa-snowflake-o" aria-hidden="true"></i> <span>Visualize</span>
            </Link>
          </div>
        ) : null}
        {moreActions || null}
        {canQuickEdit ? (
          <div className="pull-left entry-options">
            <button
              type="button"
              className="btn btn-link text-muted no-underline"
              style={{ padding: 0 }}
              onClick={() => {
                setShowQuickEdit((value) => !value);
                setShowReplyMenu(false);
                setShowContributionDrawer(false);
              }}
            >
              <i className="fa fa-pencil" aria-hidden="true"></i> <span>Quick Edit</span>
            </button>
          </div>
        ) : null}
      </div>
      {showContributionDrawer ? (
        <ContextualContributionDrawer
          entry={entry}
          objectName={objectName}
          topicId={topicIdForReply}
          onClose={() => setShowContributionDrawer(false)}
          onSubmitted={(message) => addToast('success', message)}
        />
      ) : null}
      {showQuickEdit ? (
        <div className="panel panel-default">
          <div className="panel-heading">
            <strong>Quick Edit</strong>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label htmlFor={`inline-edit-title-${entryId}`}>Title</label>
              <input
                id={`inline-edit-title-${entryId}`}
                className="form-control"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor={`inline-edit-content-${entryId}`}>Content</label>
              <textarea
                id={`inline-edit-content-${entryId}`}
                className="form-control"
                rows={5}
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
              />
            </div>
            <div>
              <button type="button" className="btn btn-primary" disabled={isSubmittingInlineAction} onClick={() => void submitQuickEdit()}>
                {isSubmittingInlineAction ? 'Saving...' : 'Save'}
              </button>{' '}
              <button type="button" className="btn btn-default" onClick={() => setShowQuickEdit(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <hr className="wt-dotted-line" style={{ marginBottom: '15px' }} />
    </>
  );
};

export default EntryQuickActions;
