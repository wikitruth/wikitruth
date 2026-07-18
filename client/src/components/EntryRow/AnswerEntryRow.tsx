import React from 'react';
import { Answer } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';

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
    <li
      className="list-group-item"
      data-id={answer._id}
      data-type="answer"
      data-private={answer.private}
    >
      <i className="fa fa-check-circle-o text-color-3" aria-hidden="true"></i>
      <EntryRowDetails
        entry={answer as unknown as LegacyEntity}
        kind="answer"
        entryPath={getAnswerLink()}
        labels={labels}
        subtitle={subtitle}
        hideAcceptedStatus={hideAcceptedStatus}
      />
    </li>
  );
};

export default AnswerEntryRow;
