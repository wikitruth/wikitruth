import React from 'react';
import { Question } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import EntryRowShell from './EntryRowShell';

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
    <EntryRowShell
      entryId={question._id}
      entryType="question"
      iconClassName="glyphicon glyphicon-question-sign text-color-3"
      isPrivate={question.private}
    >
      <EntryRowDetails
        entry={question as unknown as LegacyEntity}
        kind="question"
        entryPath={getQuestionLink()}
        labels={labels}
        subtitle={subtitle}
        hideAcceptedStatus={hideAcceptedStatus}
      />
    </EntryRowShell>
  );
};

export default QuestionEntryRow;
