import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import moderationApi from '../../services/api/moderation';
import type { LegacyEntity } from '../../types/legacy';

interface EntryActionsMenuProps {
  entry: LegacyEntity;
  editPath?: string;
}

const EntryActionsMenu: React.FC<EntryActionsMenuProps> = ({ entry, editPath }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const followStorageKey = useMemo(() => {
    return `wt-follow:${entry.objectName || 'entry'}:${entry._id}`;
  }, [entry._id, entry.objectName]);

  useEffect(() => {
    try {
      setFollowed(localStorage.getItem(followStorageKey) === '1');
    } catch (_error) {
      setFollowed(false);
    }
  }, [followStorageKey]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setStatusMessage(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const isAdmin = Boolean(user?.roles?.admin);
  const isScreener = Boolean(user?.roles?.screener);
  const isOwner = Boolean(user?._id && entry.createUserId && String(user._id) === String(entry.createUserId));
  const canEdit = Boolean(editPath) && (isOwner || isAdmin);
  const objectName = String(entry.objectName || '').trim();
  const objectType = typeof entry.objectType === 'number' ? entry.objectType : null;
  const canConvert = objectName === 'topic' || objectName === 'argument';

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
    try {
      const next = !followed;
      localStorage.setItem(followStorageKey, next ? '1' : '0');
      setFollowed(next);
      setStatusMessage(next ? 'Following entry' : 'Unfollowed entry');
    } catch (_error) {
      setStatusMessage('Unable to update follow state');
    } finally {
      setIsOpen(false);
    }
  };

  const handleReport = () => {
    setIsOpen(false);
    if (objectName === 'topic') {
      void navigate(`/issues/create?topicId=${encodeURIComponent(entry._id)}`);
      return;
    }
    void navigate('/issues/create');
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
    <div style={{ display: 'inline-block', textAlign: 'left' }}>
      <div className={`dropdown ${isOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="btn btn-default dropdown-toggle"
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
        >
          <i className="glyphicon glyphicon-option-horizontal" aria-hidden="true"></i> Actions <span className="caret"></span>
        </button>
        {isOpen && (
          <ul className="dropdown-menu dropdown-menu-right">
            {canEdit && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleEdit}>
                  <i className="fa fa-pencil" aria-hidden="true"></i> Edit
                </button>
              </li>
            )}
            <li>
              <button type="button" className="btn btn-link" onClick={handleFollow}>
                <i className="fa fa-rss" aria-hidden="true"></i> {followed ? 'Unfollow' : 'Follow'}
              </button>
            </li>
            <li>
              <button type="button" className="btn btn-link" onClick={handleShare}>
                <i className="fa fa-share" aria-hidden="true"></i> Share
              </button>
            </li>
            <li>
              <button type="button" className="btn btn-link" onClick={handleReport}>
                <i className="fa fa-flag" aria-hidden="true"></i> Report
              </button>
            </li>
            {(isScreener || isAdmin) && <li role="separator" className="divider"></li>}
            {isScreener && objectName && (
              <li>
                <button type="button" className="btn btn-link" onClick={handleScreening}>
                  <i className="fa fa-pencil-square-o" aria-hidden="true"></i> Screening Status
                </button>
              </li>
            )}
            {isAdmin && (
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
      </div>
      {statusMessage && (
        <div style={{ marginTop: '6px' }}>
          <small className="text-muted">{statusMessage}</small>
        </div>
      )}
    </div>
  );
};

export default EntryActionsMenu;
