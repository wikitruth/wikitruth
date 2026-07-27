import React from 'react';
import { Opinion } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import OpinionClassificationLabel from '../Entry/OpinionClassificationLabel';

interface OpinionEntryRowProps {
  opinion: Opinion;
  subtitle?: boolean;
  labels?: boolean;
  hideAcceptedStatus?: boolean;
}

const OpinionEntryRow: React.FC<OpinionEntryRowProps> = ({
  opinion,
  subtitle = false,
  labels = true,
  hideAcceptedStatus = false,
}) => {
  const getOpinionLink = () => {
    return `/opinions/entry/${opinion._id}`;
  };

  return (
    <li
      className="list-group-item"
      data-id={opinion._id}
      data-type="opinion"
      data-private={opinion.private}
    >
      <i className="fa fa-comment text-info" aria-hidden="true"></i>
      <EntryRowDetails
        entry={opinion as unknown as LegacyEntity}
        kind="opinion"
        entryPath={getOpinionLink()}
        labels={labels}
        subtitle={subtitle}
        hideAcceptedStatus={hideAcceptedStatus}
        extraLabels={
          <>
          <OpinionClassificationLabel value={opinion.extras?.classification} />{' '}
          {opinion.discussionContext?.status === 'potentially_obsolete' ? (
            <span className="label label-warning">older revision</span>
          ) : opinion.discussionContext?.status === 'obsolete' ? (
            <span className="label label-default">obsolete</span>
          ) : null}
          </>
        }
      />
    </li>
  );
};

export default OpinionEntryRow;
