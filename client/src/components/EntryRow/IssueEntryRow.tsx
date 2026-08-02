import React from 'react';
import { Issue } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import EntryRowShell from './EntryRowShell';

interface IssueEntryRowProps {
  issue: Issue;
  subtitle?: boolean;
  labels?: boolean;
  hideAcceptedStatus?: boolean;
}

const IssueEntryRow: React.FC<IssueEntryRowProps> = ({
  issue,
  subtitle = false,
  labels = true,
  hideAcceptedStatus = false,
}) => {
  const getIssueLink = () => {
    return `/issues/entry/${issue._id}`;
  };

  return (
    <EntryRowShell
      entryId={issue._id}
      entryType="issue"
      iconClassName="fa fa-exclamation-triangle text-warning"
      isPrivate={issue.private}
    >
      <EntryRowDetails
        entry={issue as unknown as LegacyEntity}
        kind="issue"
        entryPath={getIssueLink()}
        labels={labels}
        subtitle={subtitle}
        hideAcceptedStatus={hideAcceptedStatus}
      />
    </EntryRowShell>
  );
};

export default IssueEntryRow;
