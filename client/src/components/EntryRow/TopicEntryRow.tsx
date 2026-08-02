import React from 'react';
import { Topic } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import EntryRowShell from './EntryRowShell';

interface TopicEntryRowProps {
  topic: Topic;
  subtitle?: boolean;
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
    <EntryRowShell
      entryId={topic._id}
      entryType="topic"
      iconClassName="fa fa-folder-open text-color-3"
      isPrivate={topic.private}
    >
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
    </EntryRowShell>
  );
};

export default TopicEntryRow;
