import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import moderationApi, { type ModerationTargetKey } from '../../services/api/moderation';
import notificationsApi from '../../services/api/notifications';
import { addToClipboard } from '../../pages/ClipboardPage';
import type { LegacyEntity } from '../../types/legacy';

type ReaderSignalType = 'controversial' | 'incorrect_verdict' | 'needs_reevaluation' | 'wrong_category';

interface EntryActionsMenuProps {
  entry: LegacyEntity;
  editPath?: string;
}

function encodePathSegment(value: unknown): string {
  return encodeURIComponent(String(value || '').trim());
}

function extractNestedEntryTarget(entry: LegacyEntity, key: 'topic' | 'argument'): { id: string; friendly: string } | null {
  const nested = entry[key] as { _id?: unknown; friendlyUrl?: unknown; title?: unknown } | undefined;
  const id = String(nested?._id || '').trim();
  if (!id) {
    return null;
  }
  const friendly = String(nested?.friendlyUrl || nested?.title || id).trim();
  return { id, friendly: friendly || id };
}

function resolveEntryDetailsPath(entry: LegacyEntity, objectName: string): string {
  const defaultId = String(entry._id || '').trim();
  const defaultFriendly = String(entry.friendlyUrl || entry.title || defaultId).trim() || defaultId;

  const toFriendlyPath = (prefix: string, id: string, friendly: string): string => {
    return `${prefix}/${encodePathSegment(friendly)}/${encodePathSegment(id)}`;
  };

  if (objectName === 'topicLink') {
    const linkedTopic = extractNestedEntryTarget(entry, 'topic');
    if (linkedTopic) {
      return toFriendlyPath('/topics/entry', linkedTopic.id, linkedTopic.friendly);
    }
  }

  if (objectName === 'argumentLink') {
    const linkedArgument = extractNestedEntryTarget(entry, 'argument');
    if (linkedArgument) {
      return toFriendlyPath('/arguments/entry', linkedArgument.id, linkedArgument.friendly);
    }
  }

  switch (objectName) {
    case 'topic':
      return toFriendlyPath('/topics/entry', defaultId, defaultFriendly);
    case 'argument':
      return toFriendlyPath('/arguments/entry', defaultId, defaultFriendly);
    case 'question':
      return toFriendlyPath('/questions/entry', defaultId, defaultFriendly);
    case 'issue':
      return toFriendlyPath('/issues/entry', defaultId, defaultFriendly);
    case 'opinion':
      return toFriendlyPath('/opinions/entry', defaultId, defaultFriendly);
    case 'artifact':
      return toFriendlyPath('/artifacts/entry', defaultId, defaultFriendly);
    case 'answer':
      return `/answers/entry/${encodePathSegment(defaultId)}`;
    default:
      return `/topics/entry/${encodePathSegment(defaultId)}`;
  }
}

const EntryActionsMenu: React.FC<EntryActionsMenuProps> = ({ entry, editPath }) => {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [loadingFollowState, setLoadingFollowState] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const objectName = useMemo(() => {
    const normalized = String(entry.objectName || '').trim();
    return normalized || 'topic';
  }, [entry.objectName]);

  useEffect(() => {
    const loadFollowState = async () => {
      if (!user?._id || !objectName || !entry._id) {
        setFollowed(false);
        return;
      }

      try {
        setLoadingFollowState(true);
        const result = await notificationsApi.getSubscription(
          objectName,
          entry._id,
          typeof entry.objectType === 'number' ? entry.objectType : undefined,
        );
        setFollowed(Boolean(result.subscription?.followed));
      } catch (_error) {
        setFollowed(false);
      } finally {
        setLoadingFollowState(false);
      }
    };

    void loadFollowState();
  }, [entry._id, entry.objectType, objectName, user?._id]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setStatusMessage(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const isAdmin = Boolean(user?.roles?.admin);
  const isScreener = Boolean(user?.roles?.screener);
  const isAuthenticated = Boolean(user?._id);
  const isReaderMode = activeRole === 'reader';
  const isOwner = Boolean(user?._id && entry.createUserId && String(user._id) === String(entry.createUserId));
  const canEdit = !isReaderMode && Boolean(editPath) && (isOwner || isAdmin);
  const objectType = typeof entry.objectType === 'number' ? entry.objectType : null;
  const canConvert = objectName === 'topic' || objectName === 'argument';
  const canReply = !isReaderMode && ['topic', 'argument', 'question', 'answer', 'issue', 'opinion'].includes(objectName);
  const canFollow = Boolean(objectName) && Boolean(entry._id);
  const canCopyToClipboard = isAuthenticated && !isReaderMode;
  const canLinkEntry = isAuthenticated && !isReaderMode;
  const canReport = Boolean(entry._id);
  const canViewDetails = Boolean(entry._id);
  const canSignal = isAuthenticated && Boolean(entry._id) && Boolean(objectName);
  const canAppeal = isAuthenticated && Boolean(entry._id) && Boolean(objectName);
  const canManageEntry = !isReaderMode && (isScreener || isAdmin);

  const handleEdit = () => {
    if (!editPath) {
      return;
    }
    setIsOpen(false);
    if (editPath.startsWith('/')) {
      window.location.assign(editPath);
      return;
    }
    void navigate(editPath);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: entry.title || 'Entry', url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error('Clipboard unavailable');
      }
      setStatusMessage('Link shared');
    } catch (_error) {
      setStatusMessage('Unable to share link');
    } finally {
      setIsOpen(false);
    }
  };

  const handleFollow = () => {
    if (!objectName || !entry._id) {
      setStatusMessage('Unable to update follow state');
      return;
    }
    if (!isAuthenticated) {
      setStatusMessage('Please sign in to follow this entry.');
      return;
    }
    void (async () => {
      try {
        const next = !followed;
        const result = await notificationsApi.setSubscription({
          objectName,
          objectType: objectType || undefined,
          id: entry._id,
          enabled: next,
          triggers: ['reply', 'screening', 'verdict', 'issue'],
        });
        setFollowed(Boolean(result.subscription?.followed));
        setStatusMessage(result.subscription?.followed ? 'Following entry' : 'Unfollowed entry');
      } catch (_error) {
        setStatusMessage('Unable to update follow state');
      } finally {
        setIsOpen(false);
      }
    })();
  };

  const handleCopyToClipboard = () => {
    addToClipboard({
      _id: entry._id,
      title: entry.title || 'Untitled',
      type: objectName || 'entry',
      entryId: entry._id,
      friendlyUrl: entry.friendlyUrl,
    });
    setStatusMessage('Added to clipboard');
    setIsOpen(false);
  };

  const handleLinkTo = () => {
    setIsOpen(false);
    void navigate(`/outline/link?parentId=${encodeURIComponent(entry._id)}&parentTitle=${encodeURIComponent(entry.title || '')}`);
  };

  const handleReport = () => {
    if (!isAuthenticated) {
      setStatusMessage('Please sign in to report this entry.');
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    void navigate(`/issues/create?${encodeURIComponent(objectName)}=${encodeURIComponent(entry._id)}`);
  };

  const handleViewDetails = () => {
    setIsOpen(false);
    void navigate(resolveEntryDetailsPath(entry, objectName));
  };

  const handleSignal = () => {
    if (!objectName || !entry._id) {
      return;
    }
    const signalType = window.prompt(
      'Signal type: controversial | incorrect_verdict | needs_reevaluation | wrong_category',
      'needs_reevaluation',
    );
    if (!signalType) {
      return;
    }
    const note = window.prompt('Optional note for reviewers', '') || '';
    setIsOpen(false);
    void (async () => {
      try {
        await moderationApi.submitReaderSignal(
          {
            key: objectName as ModerationTargetKey,
            id: entry._id,
          },
          {
            signalType: signalType as ReaderSignalType,
            note,
          },
        );
        setStatusMessage('Signal submitted for moderation review');
      } catch (_error) {
        setStatusMessage('Unable to submit signal');
      }
    })();
  };

  const handleAppeal = () => {
    if (!objectName || !entry._id) {
      return;
    }
    const note = window.prompt('Appeal note (required)', '');
    if (!note) {
      return;
    }
    setIsOpen(false);
    void (async () => {
      try {
        await moderationApi.submitAppeal(
          {
            key: objectName as ModerationTargetKey,
            id: entry._id,
          },
          {
            reasonType: 'general',
            note,
          },
        );
        setStatusMessage('Appeal submitted');
      } catch (_error) {
        setStatusMessage('Unable to submit appeal');
      }
    })();
  };

  const handleReply = () => {
    setIsOpen(false);
    void navigate(`/opinions/create?parentId=${encodeURIComponent(entry._id)}&parentType=${encodeURIComponent(objectName)}`);
  };

  const handleScreening = () => {
    if (!objectName) {
      return;
    }
    setIsOpen(false);
    void navigate(`/screening?${encodeURIComponent(objectName)}=${encodeURIComponent(entry._id)}`);
  };

  const handleConvert = () => {
    if (!objectName || !canConvert) {
      return;
    }
    setIsOpen(false);
    void navigate(`/convert?${encodeURIComponent(objectName)}=${encodeURIComponent(entry._id)}`);
  };

  const handleTakeOwnership = async () => {
    if (objectType === null) {
      return;
    }
    setIsOpen(false);
    try {
      await moderationApi.takeOwnership(entry._id, objectType);
      window.location.reload();
    } catch (_error) {
      setStatusMessage('Unable to take ownership');
    }
  };

  const handleDelete = async () => {
    if (objectType === null) {
      return;
    }
    if (!window.confirm('Delete this entry? This action cannot be undone.')) {
      return;
    }
    setIsOpen(false);
    try {
      await moderationApi.deleteEntry(entry._id, objectType);
      const listRouteByObject: Record<string, string> = {
        topic: '/topics',
        topicLink: '/topics',
        argument: '/arguments',
        argumentLink: '/arguments',
        question: '/questions',
        answer: '/answers',
        issue: '/issues',
        opinion: '/opinions',
        artifact: '/artifacts',
      };
      void navigate(listRouteByObject[objectName] || '/');
    } catch (_error) {
      setStatusMessage('Unable to delete entry');
    }
  };

  return (
    <div className={`dropdown pull-left entry-options ${isOpen ? 'open' : ''}`} style={{ textAlign: 'left' }}>
      <a
        href="#"
        className="text-muted no-underline dropdown-toggle"
        title="See more options"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((value) => !value);
        }}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
      >
        <i className="glyphicon glyphicon-option-horizontal" aria-hidden="true"></i><span> more</span>
      </a>
      {isOpen && (
        <ul className="dropdown-menu dropdown-menu-right">
            <li className="dropdown-header">MORE OPTIONS</li>
            {canEdit && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleEdit}>
                  <i className="fa fa-pencil" aria-hidden="true"></i> Edit
                </button>
              </li>
            )}
            {canFollow && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleFollow}>
                  <i className="fa fa-rss" aria-hidden="true"></i>{' '}
                  {loadingFollowState ? 'Checking follow…' : followed ? 'Unfollow' : 'Follow'}
                </button>
              </li>
            )}
            <li>
              <button type="button" className="btn btn-link" onClick={handleShare}>
                <i className="fa fa-share" aria-hidden="true"></i> Share
              </button>
            </li>
            {canReply && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleReply}>
                  <i className="fa fa-reply" aria-hidden="true"></i> Reply
                </button>
              </li>
            )}
            {canCopyToClipboard && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleCopyToClipboard}>
                  <i className="fa fa-clipboard" aria-hidden="true"></i> Copy to Clipboard
                </button>
              </li>
            )}
            {canLinkEntry && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleLinkTo}>
                  <i className="fa fa-link" aria-hidden="true"></i> Link to...
                </button>
              </li>
            )}
            {canReport && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleReport}>
                  <i className="fa fa-flag" aria-hidden="true"></i> Report
                </button>
              </li>
            )}
            {canViewDetails && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleViewDetails}>
                  <i className="fa fa-info-circle" aria-hidden="true"></i> Details
                </button>
              </li>
            )}
            {canSignal && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleSignal}>
                  <i className="fa fa-bullhorn" aria-hidden="true"></i> Signal for Review
                </button>
              </li>
            )}
            {canAppeal && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleAppeal}>
                  <i className="fa fa-gavel" aria-hidden="true"></i> Submit Appeal
                </button>
              </li>
            )}
            {canManageEntry && <li role="separator" className="divider"></li>}
            {!isReaderMode && isScreener && objectName && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleScreening}>
                  <i className="fa fa-pencil-square-o" aria-hidden="true"></i> Screening Status
                </button>
              </li>
            )}
            {!isReaderMode && isAdmin && (
              <>
                {objectType !== null && !isOwner && (
                  <li>
                    <button type="button" className="btn btn-link" onClick={handleTakeOwnership}>
                      <i className="fa fa-hand-grab-o" aria-hidden="true"></i> Take Ownership
                    </button>
                  </li>
                )}
                {objectName && canConvert && (
                  <li>
                    <button type="button" className="btn btn-link" onClick={handleConvert}>
                      <i className="fa fa-recycle" aria-hidden="true"></i> Convert
                    </button>
                  </li>
                )}
                {objectType !== null && (
                  <li>
                    <button type="button" className="btn btn-link text-danger" onClick={handleDelete}>
                      <i className="fa fa-trash-o" aria-hidden="true"></i> Delete
                    </button>
                  </li>
                )}
              </>
            )}
        </ul>
      )}
      {statusMessage && (
        <div style={{ marginTop: '6px' }}>
          <small className="text-muted">{statusMessage}</small>
        </div>
      )}
    </div>
  );
};

export default EntryActionsMenu;
