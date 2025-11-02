import React from 'react';
import { Link } from 'react-router-dom';
import { Question } from '../../types';

interface QuestionEntryRowProps {
  question: Question;
  subtitle?: boolean;
  labels?: boolean;
}

const QuestionEntryRow: React.FC<QuestionEntryRowProps> = ({
  question,
  subtitle = false,
  labels = false,
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
      <div>
        <Link to={getQuestionLink()}>
          {question.title}
        </Link>
        {labels && (
          <>
            {question.private && (
              <span className="label label-default">private</span>
            )}
            {question.screening?.status && (
              <span className="label label-info">{question.screening.status}</span>
            )}
          </>
        )}
        {subtitle && (
          <div className="text-muted">
            <small>
              {question.editorUsername && (
                <>
                  <i className="fa fa-user"></i> {question.editorUsername}
                </>
              )}
              {question.editDate && (
                <>
                  {' '}
                  <i className="fa fa-clock-o"></i>{' '}
                  {new Date(question.editDate).toLocaleDateString()}
                </>
              )}
            </small>
          </div>
        )}
      </div>
    </li>
  );
};

export default QuestionEntryRow;
