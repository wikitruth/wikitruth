import React from 'react';
import { Link } from 'react-router';
import GeoPatternBackground from '../common/GeoPatternBackground';
import type { LegacyEntity } from '../../types/legacy';

type TopicBranchContextProps = {
  isMainTopic: boolean;
  categories: LegacyEntity[];
  topics: LegacyEntity[];
  siblingTopics: LegacyEntity[];
};

function getTopicPath(topic: Partial<LegacyEntity>): string {
  const id = encodeURIComponent(String(topic._id || ''));
  const friendly = encodeURIComponent(String(topic.friendlyUrl || topic._id || ''));
  return `/topics/entry/${friendly}/${id}`;
}

const TopicBranchContext: React.FC<TopicBranchContextProps> = ({
  isMainTopic,
  categories,
  topics,
  siblingTopics,
}) => {
  if (isMainTopic && categories.length > 0) {
    return (
      <div className="row" style={{ marginTop: '25px' }}>
        {categories.map((category) => {
          const subtopics = Array.isArray(category.subtopics) ? (category.subtopics as LegacyEntity[]).slice(0, 3) : [];
          const subarguments = Array.isArray(category.subarguments) ? (category.subarguments as LegacyEntity[]).slice(0, 3) : [];
          return (
            <div key={`category-tile-${category._id}`} className="col-lg-4 col-md-6 col-sm-6">
              <div className="media wt-category">
                <div className="media-left media-top">
                  <Link to={getTopicPath(category)}>
                    <GeoPatternBackground
                      seed={String(category.title || category._id)}
                      className="wt-category-icon wt-geopattern-title"
                      height={90}
                    />
                  </Link>
                </div>
                <div className="media-body">
                  <h4 className="media-heading"><Link to={getTopicPath(category)}>{category.title}</Link></h4>
                  {subtopics.map((subtopic) => (
                    <div key={`cat-subtopic-${subtopic._id}`}>
                      <i className="fa fa-folder-open text-muted" aria-hidden="true"></i>{' '}
                      <Link to={getTopicPath(subtopic)}>{String(subtopic.shortTitle || subtopic.title || '(Untitled)')}</Link>
                    </div>
                  ))}
                  {subarguments.map((subargument) => (
                    <div key={`cat-subarg-${subargument._id}`}>
                      <i className="fa fa-flash text-muted" aria-hidden="true"></i>{' '}
                      <Link to={`/arguments/entry/${encodeURIComponent(String(subargument.friendlyUrl || subargument._id))}/${encodeURIComponent(String(subargument._id))}`}>
                        {String(subargument.shortTitle || subargument.title || '(Untitled)')}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isMainTopic || (topics.length === 0 && siblingTopics.length === 0 && categories.length === 0)) {
    return null;
  }

  const groups = [
    { label: 'Peer Categories', entries: categories },
    { label: 'Subtopics', entries: topics },
    { label: 'Sibling topics', entries: siblingTopics },
  ].filter((group) => group.entries.length > 0);

  return (
    <div className="panel panel-default" style={{ marginTop: '20px' }}>
      <div className="panel-heading"><h3 className="panel-title">Branch Context</h3></div>
      <div className="panel-body">
        {groups.map((group, index) => (
          <div key={group.label} style={index < groups.length - 1 ? { marginBottom: '10px' } : undefined}>
            <strong>{group.label}:</strong>{' '}
            {group.entries.map((item) => (
              <Link key={item._id} to={getTopicPath(item)} className="wt-label label label-default" style={{ marginRight: '4px' }}>
                {item.title}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicBranchContext;
