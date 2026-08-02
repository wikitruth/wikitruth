import React from 'react';
import { Opinion } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import EntryRowShell from './EntryRowShell';
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
    <EntryRowShell
      entryId={opinion._id}
      entryType="opinion"
      iconClassName="fa fa-comment text-info"
      isPrivate={opinion.private}
    >
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
    </EntryRowShell>
  );
};

export default OpinionEntryRow;
