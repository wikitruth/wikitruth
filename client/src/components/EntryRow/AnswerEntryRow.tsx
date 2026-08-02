import React from 'react';
import { Answer } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import EntryRowShell from './EntryRowShell';

interface AnswerEntryRowProps {
  answer: Answer;
  subtitle?: boolean;
  labels?: boolean;
  hideAcceptedStatus?: boolean;
}

const AnswerEntryRow: React.FC<AnswerEntryRowProps> = ({
  answer,
  subtitle = false,
  labels = true,
  hideAcceptedStatus = false,
}) => {
  const getAnswerLink = () => {
    return `/answers/entry/${answer._id}`;
  };

  return (
    <EntryRowShell
      entryId={answer._id}
      entryType="answer"
      iconClassName="fa fa-check-circle-o text-color-3"
      isPrivate={answer.private}
    >
      <EntryRowDetails
        entry={answer as unknown as LegacyEntity}
        kind="answer"
        entryPath={getAnswerLink()}
        labels={labels}
        subtitle={subtitle}
        hideAcceptedStatus={hideAcceptedStatus}
      />
    </EntryRowShell>
  );
};

export default AnswerEntryRow;
