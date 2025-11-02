import React from 'react';
import { Link } from 'react-router-dom';
import { Answer } from '../../types';

interface AnswerEntryRowProps {
  answer: Answer;
  subtitle?: boolean;
  labels?: boolean;
}

const AnswerEntryRow: React.FC<AnswerEntryRowProps> = ({
  answer,
  subtitle = false,
  labels = false,
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
      <div>
        <Link to={getAnswerLink()}>
          {answer.title}
        </Link>
        {labels && (
          <>
            {answer.private && (
              <span className="label label-default">private</span>
            )}
            {answer.screening?.status && (
              <span className="label label-info">{answer.screening.status}</span>
            )}
          </>
        )}
        {subtitle && (
          <div className="text-muted">
            <small>
              {answer.editorUsername && (
                <>
                  <i className="fa fa-user"></i> {answer.editorUsername}
                </>
              )}
              {answer.editDate && (
                <>
                  {' '}
                  <i className="fa fa-clock-o"></i>{' '}
                  {new Date(answer.editDate).toLocaleDateString()}
                </>
              )}
            </small>
          </div>
        )}
      </div>
    </li>
  );
};

export default AnswerEntryRow;
