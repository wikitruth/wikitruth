import React from 'react';
import { Issue } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';

interface IssueEntryRowProps {
  issue: Issue;
  subtitle?: boolean;
  labels?: boolean;
}

const IssueEntryRow: React.FC<IssueEntryRowProps> = ({
  issue,
  subtitle = false,
  labels = true,
}) => {
  const getIssueLink = () => {
    return `/issues/entry/${issue._id}`;
  };

  return (
    <li
      className="list-group-item"
      data-id={issue._id}
      data-type="issue"
      data-private={issue.private}
    >
      <i className="fa fa-exclamation-triangle text-warning" aria-hidden="true"></i>
      <EntryRowDetails
        entry={issue as unknown as LegacyEntity}
        kind="issue"
        entryPath={getIssueLink()}
        labels={labels}
        subtitle={subtitle}
      />
    </li>
  );
};

export default IssueEntryRow;
