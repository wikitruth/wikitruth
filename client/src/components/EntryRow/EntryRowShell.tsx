import React from 'react';
import type { EntryRowKind } from './EntryRowDetails';

type EntryRowShellProps = {
  children: React.ReactNode;
  entryId: string;
  entryType: EntryRowKind;
  iconClassName: string;
  isPrivate?: boolean;
};

const EntryRowShell: React.FC<EntryRowShellProps> = ({
  children,
  entryId,
  entryType,
  iconClassName,
  isPrivate = false,
}) => {
  return (
    <li
      className="list-group-item wt-entry-row"
      data-id={entryId}
      data-type={entryType}
      data-private={isPrivate}
    >
      <span className="wt-entry-row-icon" aria-hidden="true">
        <span className={iconClassName}></span>
      </span>
      {children}
    </li>
  );
};

export default EntryRowShell;
