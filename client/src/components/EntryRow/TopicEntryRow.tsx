import React from 'react';
import { Link } from 'react-router-dom';
import { Topic } from '../../types';

interface TopicEntryRowProps {
  topic: Topic;
  subtitle?: boolean;
  standalone?: boolean;
  labels?: boolean;
  contentPreview?: string;
  showMore?: boolean;
}

const TopicEntryRow: React.FC<TopicEntryRowProps> = ({
  topic,
  subtitle = false,
  standalone = false,
  labels = false,
  contentPreview,
  showMore = false,
}) => {
  const getTopicLink = () => {
    return `/topics/entry/${topic.friendlyUrl}/${topic._id}`;
  };

  return (
    <li
      className="list-group-item"
      data-id={topic._id}
      data-type="topic"
      data-private={topic.private}
    >
      <i className="fa fa-folder-open text-color-3" aria-hidden="true"></i>
      <div>
        <Link to={getTopicLink()}>
          {standalone ? topic.title : topic.title}
        </Link>
        {labels && (
          <>
            {topic.private && (
              <span className="label label-default">private</span>
            )}
            {topic.screening?.status && (
              <span className="label label-info">{topic.screening.status}</span>
            )}
          </>
        )}
        {subtitle && (
          <div className="text-muted">
            <small>
              {topic.editorUsername && (
                <>
                  <i className="fa fa-user"></i> {topic.editorUsername}
                </>
              )}
              {topic.editDate && (
                <>
                  {' '}
                  <i className="fa fa-clock-o"></i>{' '}
                  {new Date(topic.editDate).toLocaleDateString()}
                </>
              )}
            </small>
          </div>
        )}
        {contentPreview && (
          <div className="wt-entry-row-content">
            {contentPreview}{' '}
            {showMore && (
              <a href="#" className="wt-show-more">
                Show More
              </a>
            )}
          </div>
        )}
      </div>
      <span className="pull-right text-muted hidden-xxs">
        <span className="glyphicon glyphicon-comment" aria-hidden="true"></span>{' '}
        {topic.childrenCount?.topics?.total || 0}
      </span>
    </li>
  );
};

export default TopicEntryRow;
