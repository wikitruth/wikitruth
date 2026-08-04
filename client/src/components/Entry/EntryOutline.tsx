import React from 'react';
import { Link } from 'react-router';
import type { LegacyEntity } from '../../types/legacy';

interface EntryOutlineProps {
  keyTopics?: LegacyEntity[];
  keyArguments?: LegacyEntity[];
}

function getEntryTitle(entry: LegacyEntity): string {
  const link = entry.link as LegacyEntity | undefined;
  return String(link?.title || entry.title || '(Untitled)');
}

function getEntryPath(entry: LegacyEntity, type: 'topic' | 'argument'): string {
  const id = encodeURIComponent(String(entry._id || ''));
  const friendly = encodeURIComponent(String(entry.friendlyUrl || entry._id || ''));
  return type === 'topic' ? `/topics/entry/${friendly}/${id}` : `/arguments/entry/${friendly}/${id}`;
}

const EntryOutline: React.FC<EntryOutlineProps> = ({ keyTopics = [], keyArguments = [] }) => {
  if (keyTopics.length === 0 && keyArguments.length === 0) {
    return null;
  }

  return (
    <div className="wt-entry-outline" style={{ marginTop: '15px' }}>
      {keyTopics.length > 0 ? (
        <div style={{ marginBottom: '10px' }}>
          <strong>Key topics</strong>
          <ul className="min-indent">
            {keyTopics.map((topic) => (
              <li key={`key-topic-${String(topic._id)}`}>
                <Link to={getEntryPath(topic, 'topic')}>{getEntryTitle(topic)}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {keyArguments.length > 0 ? (
        <div style={{ marginBottom: '10px' }}>
          <strong>Key facts</strong>
          <ul className="min-indent">
            {keyArguments.map((argument) => (
              <li key={`key-argument-${String(argument._id)}`}>
                <Link to={getEntryPath(argument, 'argument')}>{getEntryTitle(argument)}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default EntryOutline;
