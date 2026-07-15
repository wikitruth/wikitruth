import React from 'react';
import { Argument } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';

interface ArgumentEntryRowProps {
  argument: Argument;
  subtitle?: boolean;
  labels?: boolean;
}

const ArgumentEntryRow: React.FC<ArgumentEntryRowProps> = ({
  argument,
  subtitle = false,
  labels = true,
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
    <li
      className="list-group-item"
      data-id={argument._id}
      data-type="argument"
      data-private={argument.private}
    >
      <span className={`glyphicon glyphicon-flash ${getVerdictClass()}`} aria-hidden="true"></span>
      <EntryRowDetails
        entry={argument as unknown as LegacyEntity}
        kind="argument"
        entryPath={getArgumentLink()}
        labels={labels}
        subtitle={subtitle}
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
    </li>
  );
};

export default ArgumentEntryRow;
