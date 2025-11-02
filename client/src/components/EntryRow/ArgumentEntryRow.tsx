import React from 'react';
import { Link } from 'react-router-dom';
import { Argument } from '../../types';

interface ArgumentEntryRowProps {
  argument: Argument;
  subtitle?: boolean;
  labels?: boolean;
}

const ArgumentEntryRow: React.FC<ArgumentEntryRowProps> = ({
  argument,
  subtitle = false,
  labels = false,
}) => {
  const getArgumentLink = () => {
    return `/arguments/entry/${argument.friendlyUrl}/${argument._id}`;
  };

  const getVerdictClass = () => {
    if (!argument.verdict?.result) return 'text-muted';
    switch (argument.verdict.result) {
      case 'true':
        return 'text-success';
      case 'false':
        return 'text-danger';
      case 'unknown':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };

  return (
    <li
      className="list-group-item"
      data-id={argument._id}
      data-type="argument"
      data-private={argument.private}
    >
      <span className={`glyphicon glyphicon-flash ${getVerdictClass()}`} aria-hidden="true"></span>
      <div>
        <Link to={getArgumentLink()}>
          {argument.title}
        </Link>
        {labels && (
          <>
            {argument.private && (
              <span className="label label-default">private</span>
            )}
            {argument.screening?.status && (
              <span className="label label-info">{argument.screening.status}</span>
            )}
            {argument.verdict?.result && (
              <span className={`label ${
                argument.verdict.result === 'true' ? 'label-success' :
                argument.verdict.result === 'false' ? 'label-danger' :
                'label-warning'
              }`}>
                {argument.verdict.result}
              </span>
            )}
          </>
        )}
        {subtitle && (
          <div className="text-muted">
            <small>
              {argument.editorUsername && (
                <>
                  <i className="fa fa-user"></i> {argument.editorUsername}
                </>
              )}
              {argument.editDate && (
                <>
                  {' '}
                  <i className="fa fa-clock-o"></i>{' '}
                  {new Date(argument.editDate).toLocaleDateString()}
                </>
              )}
            </small>
          </div>
        )}
      </div>
    </li>
  );
};

export default ArgumentEntryRow;
