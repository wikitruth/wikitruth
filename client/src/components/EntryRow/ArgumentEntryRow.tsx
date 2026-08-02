import React from 'react';
import { Argument } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import EntryRowShell from './EntryRowShell';

interface ArgumentEntryRowProps {
  argument: Argument;
  subtitle?: boolean;
  labels?: boolean;
  hideAcceptedStatus?: boolean;
}

const ArgumentEntryRow: React.FC<ArgumentEntryRowProps> = ({
  argument,
  subtitle = false,
  labels = true,
  hideAcceptedStatus = false,
}) => {
  const getArgumentLink = () => {
    return `/arguments/entry/${argument.friendlyUrl}/${argument._id}`;
  };

  const getVerdictClass = () => {
    if (!argument.verdict?.result) return 'text-muted';
    switch (argument.verdict.result) {
      case 'true':
        return 'text-success';
      case 'false':
        return 'text-danger';
      case 'unknown':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };

  return (
    <EntryRowShell
      entryId={argument._id}
      entryType="argument"
      iconClassName={`glyphicon glyphicon-flash ${getVerdictClass()}`}
      isPrivate={argument.private}
    >
      <EntryRowDetails
        entry={argument as unknown as LegacyEntity}
        kind="argument"
        entryPath={getArgumentLink()}
        labels={labels}
        subtitle={subtitle}
        hideAcceptedStatus={hideAcceptedStatus}
        extraLabels={
          labels && argument.verdict?.result ? (
            <span
              className={`label ${argument.verdict.result === 'true' ? 'label-success' : argument.verdict.result === 'false' ? 'label-danger' : 'label-warning'}`}
            >
              {argument.verdict.result}
            </span>
          ) : null
        }
      />
    </EntryRowShell>
  );
};

export default ArgumentEntryRow;
