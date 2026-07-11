import React from 'react';
import type { LegacyEntity } from '../../types/legacy';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

type TopicDetailsContentProps = {
  topic: LegacyEntity;
  style?: React.CSSProperties;
  showSeeMore: boolean;
  expanded: boolean;
  onExpand: () => void;
};

const TopicDetailsContent: React.FC<TopicDetailsContentProps> = ({ topic, style, showSeeMore, expanded, onExpand }) => (
  <div className="text-body collapsible" style={{ marginTop: '20px', ...style }}>
    {topic.content ? (
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(topic.content) }} />
    ) : topic.description ? (
      <p className="lead">{topic.description}</p>
    ) : (
      <p className="text-muted">No content available for this topic yet.</p>
    )}
    {showSeeMore && !expanded ? (
      <a href="#" onClick={(event) => { event.preventDefault(); onExpand(); }} className="content-see-more">
        <span className="content-see-more-gradient"></span>
        <span className="content-see-more-text">See more</span>
      </a>
    ) : null}
  </div>
);

export default TopicDetailsContent;
