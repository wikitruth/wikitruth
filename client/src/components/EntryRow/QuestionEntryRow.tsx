import React from 'react';
import { Question } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';

interface QuestionEntryRowProps {
  question: Question;
  subtitle?: boolean;
  labels?: boolean;
  hideAcceptedStatus?: boolean;
}

const QuestionEntryRow: React.FC<QuestionEntryRowProps> = ({
  question,
  subtitle = false,
  labels = true,
  hideAcceptedStatus = false,
}) => {
  const getQuestionLink = () => {
    return `/questions/entry/${question.friendlyUrl}/${question._id}`;
  };

  return (
    <li
      className="list-group-item"
      data-id={question._id}
      data-type="question"
      data-private={question.private}
    >
      <span className="glyphicon glyphicon-question-sign text-color-3" aria-hidden="true"></span>
      <EntryRowDetails
        entry={question as unknown as LegacyEntity}
        kind="question"
        entryPath={getQuestionLink()}
        labels={labels}
        subtitle={subtitle}
        hideAcceptedStatus={hideAcceptedStatus}
      />
    </li>
  );
};

export default QuestionEntryRow;
