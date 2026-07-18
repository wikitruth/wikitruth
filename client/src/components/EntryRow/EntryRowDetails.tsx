import React from 'react';
import { Link } from 'react-router-dom';
import type { LegacyEntity } from '../../types/legacy';
import { formatRelativeTime } from '../../utils/dateFormat';
import { getScreeningStatusPresentation } from '../../utils/screeningStatus';

export type EntryRowKind =
  'topic' | 'argument' | 'question' | 'answer' | 'artifact' | 'issue' | 'opinion';

type EntryRowDetailsProps = {
  entry: LegacyEntity;
  kind: EntryRowKind;
  entryPath: string;
  labels?: boolean;
  subtitle?: boolean;
  contentPreview?: string;
  showMore?: boolean;
  hideAcceptedStatus?: boolean;
  extraLabels?: React.ReactNode;
};

const PARENT_FIELDS: Array<{ field: keyof LegacyEntity; kind: EntryRowKind }> = [
  { field: 'parentTopic', kind: 'topic' },
  { field: 'parentArgument', kind: 'argument' },
  { field: 'parentQuestion', kind: 'question' },
  { field: 'parentAnswer', kind: 'answer' },
  { field: 'parentArtifact', kind: 'artifact' },
  { field: 'parentIssue', kind: 'issue' },
  { field: 'parentOpinion', kind: 'opinion' },
];

function entryPath(entry: LegacyEntity, kind: EntryRowKind): string {
  const id = encodeURIComponent(String(entry._id || ''));
  const friendly = encodeURIComponent(String(entry.friendlyUrl || entry.title || entry._id || ''));
  if (kind === 'answer') {
    return `/answers/entry/${id}`;
  }
  return `/${kind === 'issue' ? 'issues' : `${kind}s`}/entry/${friendly}/${id}`;
}

function resolveParent(
  entry: LegacyEntity
): { entry: LegacyEntity; kind: EntryRowKind; path: string } | null {
  for (const candidate of PARENT_FIELDS) {
    const parent = entry[candidate.field] as LegacyEntity | undefined;
    if (parent?._id && parent.title) {
      return { entry: parent, kind: candidate.kind, path: entryPath(parent, candidate.kind) };
    }
  }
  return null;
}

function discussionPath(kind: EntryRowKind, path: string): string | null {
  return kind === 'artifact' ? null : `${path}/discussion`;
}

const EntryRowDetails: React.FC<EntryRowDetailsProps> = ({
  entry,
  kind,
  entryPath: path,
  labels = true,
  subtitle = true,
  contentPreview,
  showMore = false,
  hideAcceptedStatus = false,
  extraLabels,
}) => {
  const status = getScreeningStatusPresentation(entry.screening?.status);
  const acceptedStatus = status?.label === 'accepted';
  const parent = resolveParent(entry);
  const preview = String(contentPreview || entry.contentPreview || entry.description || '').trim();
  const editor = String(
    entry.editUsername || entry.editorUsername || entry.createUsername || ''
  ).trim();
  const editorAction = entry.editUsername || entry.editorUsername ? 'Edited by' : 'Created by';
  const rawDate = entry.editDate || entry.createDate;
  const dateLabel = String(entry.editDateString || formatRelativeTime(rawDate) || '').trim();
  const fullDate =
    rawDate && !Number.isNaN(new Date(rawDate).getTime())
      ? new Date(rawDate).toString()
      : undefined;
  const comments = Number(entry.comments || entry.childrenCount?.opinions?.total || 0);
  const points = Number(entry.points || 0);
  const discussPath = discussionPath(kind, path);
  const thumbnailPath = String(entry.thumbnailPath || '').trim();
  const filePath = String(entry.filePath || thumbnailPath).trim();

  return (
    <div className="wt-entry-row-main">
      {parent ? (
        <div className="wt-entry-row-subtitle">
          <span className="text-muted">On {parent.kind} </span>
          <Link to={parent.path}>{parent.entry.title}</Link>
        </div>
      ) : null}
      <div className="wt-entry-row-title">
        <Link to={path}>{entry.title || '(Untitled)'}</Link>
        {labels && entry.private ? <span className="label label-default">private</span> : null}
        {labels && status && !(acceptedStatus && hideAcceptedStatus) ? (
          acceptedStatus ? (
            <span
              className="wt-screening-status wt-screening-status-accepted"
              role="img"
              aria-label="Accepted after screening"
              title="Accepted after screening"
            >
              <i className="fa fa-check-circle" aria-hidden="true"></i>
            </span>
          ) : (
            <span className={`label ${status.className}`}>{status.label}</span>
          )
        ) : null}
        {extraLabels}
      </div>
      {preview ? (
        <div className="wt-entry-row-content">
          {preview}
          {showMore || entry.showMore ? (
            <span className="text-muted" aria-label="Preview continues">
              {' '}
              ...
            </span>
          ) : null}
        </div>
      ) : null}
      {thumbnailPath ? (
        <div className="artifact-img wt-entry-row-media">
          <a href={filePath} target="_blank" rel="noreferrer" title="Open original file">
            <img src={thumbnailPath} className="img-responsive" alt={entry.title || 'Artifact'} />
          </a>
        </div>
      ) : null}
      {subtitle || editor || dateLabel || comments > 0 || points !== 0 ? (
        <div className="wt-entry-row-footer text-muted">
          {editor ? (
            <span>
              <i className="fa fa-user" aria-hidden="true"></i> {editorAction}{' '}
              <Link
                to={`/members/${encodeURIComponent(editor)}`}
                title={`View ${editor}'s profile`}
              >
                {editor}
              </Link>
            </span>
          ) : null}
          {dateLabel ? (
            <span title={fullDate}>
              <i className="fa fa-clock-o" aria-hidden="true"></i> {dateLabel}
            </span>
          ) : null}
          {parent ? (
            <Link to={parent.path}>
              <i className="fa fa-dot-circle-o" aria-hidden="true"></i> root
            </Link>
          ) : null}
          {kind !== 'artifact' ? (
            <Link
              to={`/opinions/create?parentId=${encodeURIComponent(entry._id)}&parentType=${kind}`}
            >
              <i className="fa fa-reply" aria-hidden="true"></i> reply
            </Link>
          ) : null}
          {discussPath && comments > 0 ? (
            <Link to={discussPath}>
              <i className="fa fa-comment-o" aria-hidden="true"></i> {comments}
            </Link>
          ) : comments > 0 ? (
            <span>
              <i className="fa fa-comment-o" aria-hidden="true"></i> {comments}
            </span>
          ) : null}
          {points !== 0 ? (
            <span>
              <i className="fa fa-thumbs-o-up" aria-hidden="true"></i> {points}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default EntryRowDetails;
