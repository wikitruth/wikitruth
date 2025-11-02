import React from 'react';
import { Link } from 'react-router-dom';
import { Opinion } from '../../types';

interface OpinionEntryRowProps {
  opinion: Opinion;
  subtitle?: boolean;
  labels?: boolean;
}

const OpinionEntryRow: React.FC<OpinionEntryRowProps> = ({
  opinion,
  subtitle = false,
  labels = false,
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
      <div>
        <Link to={getOpinionLink()}>
          {opinion.title}
        </Link>
        {labels && (
          <>
            {opinion.private && (
              <span className="label label-default">private</span>
            )}
            {opinion.screening?.status && (
              <span className="label label-info">{opinion.screening.status}</span>
            )}
          </>
        )}
        {subtitle && (
          <div className="text-muted">
            <small>
              {opinion.editorUsername && (
                <>
                  <i className="fa fa-user"></i> {opinion.editorUsername}
                </>
              )}
              {opinion.editDate && (
                <>
                  {' '}
                  <i className="fa fa-clock-o"></i>{' '}
                  {new Date(opinion.editDate).toLocaleDateString()}
                </>
              )}
            </small>
          </div>
        )}
      </div>
    </li>
  );
};

export default OpinionEntryRow;
