import React from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import type { LegacyEntity } from '../../types/legacy';

interface EntryQuickActionsProps {
  entry: LegacyEntity;
  objectName?: string;
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

const EntryQuickActions: React.FC<EntryQuickActionsProps> = ({
  entry,
  objectName: providedObjectName,
  moreActions,
}) => {
  const { addToast } = useNotification();
  const objectName = String(providedObjectName || entry.objectName || '').trim() || 'topic';
  const topicIdForReply = getTopicIdForReply(entry, objectName);
  const replyPath = `/opinions/create?topicId=${encodeURIComponent(topicIdForReply)}&parentId=${encodeURIComponent(String(entry._id || ''))}`;
  const visualizePath = getVisualizePath(entry, objectName);

  const handleUnimplementedVote = (label: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    addToast('info', `${label} is not wired yet in modern client. This is display parity only.`);
  };

  return (
    <>
      <div className="wt-entry-options-container clearfix" style={{ marginTop: '6px' }}>
        <div className="pull-left entry-options">
          <Link className="text-muted no-underline" to={replyPath}>
            <i className="fa fa-reply" aria-hidden="true"></i> <span>Reply</span>
          </Link>
        </div>
        <div className="pull-left entry-options">
          <a className="text-muted no-underline" href="#" onClick={handleUnimplementedVote('Expose')}>
            <i className="fa fa-arrow-circle-o-up" aria-hidden="true"></i> <span>Expose</span>
          </a>
        </div>
        <div className="pull-left entry-options">
          <a className="text-muted no-underline" href="#" onClick={handleUnimplementedVote('Bury')}>
            <i className="fa fa-arrow-circle-o-down" aria-hidden="true"></i> <span>Bury</span>
          </a>
        </div>
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
