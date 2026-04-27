import React from 'react';
import { Link } from 'react-router-dom';
import type { LegacyEntity } from '../../types/legacy';
import { formatRelativeTime } from '../../utils/dateFormat';

export type EntryObjectName = 'topic' | 'argument' | 'question' | 'answer' | 'artifact' | 'issue' | 'opinion';

type EntryLinkRef = Pick<LegacyEntity, '_id' | 'friendlyUrl' | 'title'>;

function toTopicEntryPath(topic?: EntryLinkRef | null): string {
  const id = encodeURIComponent(String(topic?._id || ''));
  const friendly = encodeURIComponent(String(topic?.friendlyUrl || topic?._id || ''));
  return `/topics/entry/${friendly}/${id}`;
}

function toEntryPath(basePath: string, item?: EntryLinkRef | null): string {
  const id = encodeURIComponent(String(item?._id || ''));
  const friendly = encodeURIComponent(String(item?.friendlyUrl || item?._id || ''));
  return `${basePath}/${friendly}/${id}`;
}

function getLinkTitle(item?: EntryLinkRef | null, fallback = '(Untitled)'): string {
  const title = String(item?.title || '').trim();
  return title || fallback;
}

function getContextTarget(entry: LegacyEntity): { kind: string; icon: string; item?: EntryLinkRef | null; href: string } | null {
  if (entry.parentOpinion?._id) {
    return { kind: 'parent comment', icon: 'comments-o', item: entry.parentOpinion, href: toEntryPath('/opinions/entry', entry.parentOpinion) };
  }
  if (entry.parentIssue?._id) {
    return { kind: 'issue', icon: 'exclamation-circle', item: entry.parentIssue, href: toEntryPath('/issues/entry', entry.parentIssue) };
  }
  if (entry.parentAnswer?._id) {
    return { kind: 'answer', icon: 'check-circle-o', item: entry.parentAnswer, href: toEntryPath('/answers/entry', entry.parentAnswer) };
  }
  if (entry.parentQuestion?._id) {
    return { kind: 'question', icon: 'question-circle-o', item: entry.parentQuestion, href: toEntryPath('/questions/entry', entry.parentQuestion) };
  }
  if (entry.parentArtifact?._id) {
    return { kind: 'artifact', icon: 'puzzle-piece', item: entry.parentArtifact, href: toEntryPath('/artifacts/entry', entry.parentArtifact) };
  }
  if (entry.parentArgument?._id) {
    return { kind: 'fact', icon: 'bolt', item: entry.parentArgument, href: toEntryPath('/arguments/entry', entry.parentArgument) };
  }
  if (entry.parentTopic?._id) {
    return { kind: 'topic', icon: 'folder-open-o', item: entry.parentTopic, href: toTopicEntryPath(entry.parentTopic) };
  }
  return null;
}

export const EntryContextLine: React.FC<{ entry: LegacyEntity; objectName: EntryObjectName }> = ({
  entry,
  objectName,
}) => {
  const style: React.CSSProperties = { marginTop: '-6px', marginBottom: '8px' };
  const linkedTopic = entry.parentTopic && entry.parentTopic._id ? entry.parentTopic : null;

  if (objectName === 'topic') {
    return (
      <div className="text-muted" style={style}>
        <small>
          <i className="fa fa-folder-open-o" aria-hidden="true"></i>{' '}
          {linkedTopic ? (
            <>
              A sub-topic under <Link to={toTopicEntryPath(linkedTopic)}>{getLinkTitle(linkedTopic)}</Link>
            </>
          ) : (
            'A topic category'
          )}
        </small>
      </div>
    );
  }

  if (objectName === 'argument') {
    if (entry.parentArgument?._id) {
      return (
        <div className="text-muted" style={style}>
          <small>
            <i className="fa fa-bolt" aria-hidden="true"></i>{' '}
            A sub-fact under <Link to={toEntryPath('/arguments/entry', entry.parentArgument)}>{getLinkTitle(entry.parentArgument)}</Link>
          </small>
        </div>
      );
    }
    return (
      <div className="text-muted" style={style}>
        <small>
          <i className="fa fa-bolt" aria-hidden="true"></i>{' '}
          {linkedTopic ? (
            <>
              A fact under the topic <Link to={toTopicEntryPath(linkedTopic)}>{getLinkTitle(linkedTopic)}</Link>
            </>
          ) : (
            'A fact entry'
          )}
        </small>
      </div>
    );
  }

  if (objectName === 'artifact') {
    return (
      <div className="text-muted" style={style}>
        <small>
          <i className="fa fa-puzzle-piece" aria-hidden="true"></i>{' '}
          {linkedTopic ? (
            <>
              An artifact under the topic <Link to={toTopicEntryPath(linkedTopic)}>{getLinkTitle(linkedTopic)}</Link>
            </>
          ) : (
            'An artifact entry'
          )}
        </small>
      </div>
    );
  }

  if (objectName === 'question') {
    return (
      <div className="text-muted" style={style}>
        <small>
          <i className="fa fa-question-circle-o" aria-hidden="true"></i>{' '}
          {entry.parentArgument?._id ? (
            <>
              A question on fact{' '}
              <Link to={toEntryPath('/arguments/entry', entry.parentArgument)}>{getLinkTitle(entry.parentArgument)}</Link>
            </>
          ) : linkedTopic ? (
            <>
              A question under the topic <Link to={toTopicEntryPath(linkedTopic)}>{getLinkTitle(linkedTopic)}</Link>
            </>
          ) : (
            'A question entry'
          )}
        </small>
      </div>
    );
  }

  if (objectName === 'answer') {
    return (
      <div className="text-muted" style={style}>
        <small>
          <i className="fa fa-check-circle-o" aria-hidden="true"></i>{' '}
          {entry.parentQuestion?._id ? (
            <>
              An answer on question{' '}
              <Link to={toEntryPath('/questions/entry', entry.parentQuestion)}>{getLinkTitle(entry.parentQuestion)}</Link>
            </>
          ) : (
            'An answer entry'
          )}
        </small>
      </div>
    );
  }

  const target = getContextTarget(entry);
  if (!target) {
    return (
      <div className="text-muted" style={style}>
        <small>
          <i className={`fa fa-${objectName === 'issue' ? 'exclamation-circle' : 'comments-o'}`} aria-hidden="true"></i>{' '}
          {objectName === 'issue' ? 'An issue entry' : 'A comment entry'}
        </small>
      </div>
    );
  }

  return (
    <div className="text-muted" style={style}>
      <small>
        <i className={`fa fa-${objectName === 'issue' ? 'exclamation-circle' : 'comments-o'}`} aria-hidden="true"></i>{' '}
        {objectName === 'issue' ? 'An issue on' : 'A comment on'} {target.kind}{' '}
        <Link to={target.href}>{getLinkTitle(target.item)}</Link>
      </small>
    </div>
  );
};

export const EntryRelatedTopics: React.FC<{ entry: LegacyEntity; topicLinks?: LegacyEntity[] }> = ({ entry, topicLinks }) => {
  const items: EntryLinkRef[] = [];
  const seen = new Set<string>();
  const pushUnique = (topic?: EntryLinkRef | null) => {
    const key = String(topic?._id || topic?.title || '').trim();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    items.push(topic as EntryLinkRef);
  };

  pushUnique(entry.parentTopic);
  const safeTopicLinks = Array.isArray(topicLinks) ? topicLinks : [];
  safeTopicLinks.forEach((topic) => pushUnique(topic));

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="wt-related" style={{ marginTop: '20px' }}>
      <span title="Related Topics">Topics</span>&nbsp;
      {items.map((topic) => (
        <Link key={String(topic._id || topic.title)} to={toTopicEntryPath(topic)}>
          <span className="wt-label label label-default">{getLinkTitle(topic)}</span>
        </Link>
      ))}
    </div>
  );
};

export const EntryMetaBlock: React.FC<{ entry: LegacyEntity }> = ({ entry }) => {
  const createUsername = String(entry.createUsername || entry.editorUsername || entry.username || '').trim();
  const editUsername = String(entry.editUsername || entry.editorUsername || createUsername).trim();
  const posted = formatRelativeTime(entry.createDate || entry.editDate);
  const edited = formatRelativeTime(entry.editDate || entry.createDate);
  const postedLabel = posted || 'unknown time';
  const editedLabel = edited || postedLabel;
  const avatarInitial = createUsername ? createUsername.slice(0, 1).toUpperCase() : '?';

  return (
    <div style={{ marginTop: '26px', paddingTop: '14px', borderTop: '1px solid #eee' }}>
      <div className="media wt-category-x">
        <div className="media-left media-top">
          {createUsername ? (
            <Link to={`/members/${encodeURIComponent(createUsername)}`}>
              <div
                title={createUsername}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#2d7f5e',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {avatarInitial}
              </div>
            </Link>
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#2d7f5e',
              }}
            />
          )}
        </div>
        <div className="media-body">
          <h4 className="media-heading" style={{ marginTop: 0 }}>
            {createUsername ? (
              <Link to={`/members/${encodeURIComponent(createUsername)}`}>{createUsername}</Link>
            ) : (
              '(Unknown author)'
            )}
          </h4>
          <small className="text-muted">
            <i className="fa fa-clock-o text-muted-2"></i> Posted {postedLabel}
            {editUsername ? (
              <>
                {' '}| <i className="fa fa-clock-o text-muted-2"></i> Edited {editedLabel}
                {editUsername !== createUsername ? ` by ${editUsername}` : ''}
              </>
            ) : null}
          </small>
          {entry.private ? (
            <div style={{ marginTop: '6px' }}>
              <span className="label label-default">Private</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
