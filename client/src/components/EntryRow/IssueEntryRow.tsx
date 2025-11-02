import React from 'react';
import { Link } from 'react-router-dom';
import { Issue } from '../../types';

interface IssueEntryRowProps {
  issue: Issue;
  subtitle?: boolean;
  labels?: boolean;
}

const IssueEntryRow: React.FC<IssueEntryRowProps> = ({
  issue,
  subtitle = false,
  labels = false,
}) => {
  const getIssueLink = () => {
    return `/issues/entry/${issue._id}`;
  };

  return (
    <li
      className="list-group-item"
      data-id={issue._id}
      data-type="issue"
      data-private={issue.private}
    >
      <i className="fa fa-exclamation-triangle text-warning" aria-hidden="true"></i>
      <div>
        <Link to={getIssueLink()}>
          {issue.title}
        </Link>
        {labels && (
          <>
            {issue.private && (
              <span className="label label-default">private</span>
            )}
            {issue.screening?.status && (
              <span className="label label-info">{issue.screening.status}</span>
            )}
          </>
        )}
        {subtitle && (
          <div className="text-muted">
            <small>
              {issue.editorUsername && (
                <>
                  <i className="fa fa-user"></i> {issue.editorUsername}
                </>
              )}
              {issue.editDate && (
                <>
                  {' '}
                  <i className="fa fa-clock-o"></i>{' '}
                  {new Date(issue.editDate).toLocaleDateString()}
                </>
              )}
            </small>
          </div>
        )}
      </div>
    </li>
  );
};

export default IssueEntryRow;
