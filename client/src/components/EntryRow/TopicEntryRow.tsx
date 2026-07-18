import React from 'react';
import { Topic } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';

interface TopicEntryRowProps {
  topic: Topic;
  subtitle?: boolean;
  standalone?: boolean;
  labels?: boolean;
  contentPreview?: string;
  showMore?: boolean;
  hideAcceptedStatus?: boolean;
}

const TopicEntryRow: React.FC<TopicEntryRowProps> = ({
  topic,
  subtitle = false,
  labels = true,
  contentPreview,
  showMore = false,
  hideAcceptedStatus = false,
}) => {
  const getTopicLink = () => {
    return `/topics/entry/${topic.friendlyUrl}/${topic._id}`;
  };

  return (
    <li
      className="list-group-item"
      data-id={topic._id}
      data-type="topic"
      data-private={topic.private}
    >
      <i className="fa fa-folder-open text-color-3" aria-hidden="true"></i>
      <EntryRowDetails
        entry={topic as unknown as LegacyEntity}
        kind="topic"
        entryPath={getTopicLink()}
        labels={labels}
        subtitle={subtitle}
        contentPreview={contentPreview}
        showMore={showMore}
        hideAcceptedStatus={hideAcceptedStatus}
      />
    </li>
  );
};

export default TopicEntryRow;
