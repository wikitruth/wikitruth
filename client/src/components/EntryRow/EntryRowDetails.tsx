import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { LegacyEntity } from '../../types/legacy';
import { formatRelativeTime } from '../../utils/dateFormat';
import { getScreeningStatusPresentation } from '../../utils/screeningStatus';
import EntryActionsMenu from '../Entry/EntryActionsMenu';
import EntryReplyMenu from '../Entry/EntryReplyMenu';
import EntryChildrenPanel from './EntryChildrenPanel';
import { getEntryRowPath } from './entryRowPaths';
import { useContentVisibility } from '../../context/ContentVisibilityContext';
import { countForView, visibilityLabel } from '../../utils/contentVisibility';

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

function resolveParent(
  entry: LegacyEntity
): { entry: LegacyEntity; kind: EntryRowKind; path: string } | null {
  for (const candidate of PARENT_FIELDS) {
    const parent = entry[candidate.field] as LegacyEntity | undefined;
    if (parent?._id && parent.title) {
      return { entry: parent, kind: candidate.kind, path: getEntryRowPath(parent, candidate.kind) };
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
  const [contentExpanded, setContentExpanded] = useState(false);
  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const { effectiveView } = useContentVisibility();
  const status = getScreeningStatusPresentation(entry.screening?.status);
  const acceptedStatus = status?.label === 'accepted';
  const parent = resolveParent(entry);
  const preview = String(contentPreview || entry.contentPreview || entry.description || '').trim();
  const fullContent = String(entry.content || entry.description || preview).trim();
  const canExpandContent = Boolean((showMore || entry.showMore) && fullContent && fullContent !== preview);
  const renderedContent = contentExpanded && canExpandContent ? fullContent : preview;
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
  const comments = Number(entry.comments ?? 0);
  const positiveReactions = Number(entry.points ?? entry.discoveryRanking?.positive ?? 0);
  const discussPath = discussionPath(kind, path);
  const thumbnailPath = String(entry.thumbnailPath || '').trim();
  const filePath = String(entry.filePath || thumbnailPath).trim();
  const childCounts = useMemo(() => {
    const labels: Record<string, { label: string; icon: string }> = {
      topics: { label: 'topics', icon: 'fa fa-folder-open' },
      arguments: { label: 'facts', icon: 'glyphicon glyphicon-flash' },
      questions: { label: 'questions', icon: 'fa fa-question-circle' },
      answers: { label: 'answers', icon: 'fa fa-check-circle-o' },
      artifacts: { label: 'artifacts', icon: 'fa fa-puzzle-piece' },
      issues: { label: 'issues', icon: 'fa fa-exclamation-circle' },
      opinions: { label: 'comments', icon: 'fa fa-comments-o' },
    };
    return Object.entries(labels).flatMap(([key, presentation]) => {
      const count = countForView(
        entry.childrenCount?.[key as keyof NonNullable<LegacyEntity['childrenCount']>],
        effectiveView,
      );
      return count > 0 ? [{ key, count, ...presentation }] : [];
    });
  }, [effectiveView, entry.childrenCount]);
  const hasChildren = childCounts.length > 0;

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
      {renderedContent ? (
        <div className="wt-entry-row-content">
          {renderedContent}
          {canExpandContent ? (
            <button
              type="button"
              className="btn btn-link wt-entry-row-show-more"
              onClick={() => setContentExpanded((value) => !value)}
              aria-expanded={contentExpanded}
            >
              {contentExpanded ? 'Show less' : 'Show more'}
            </button>
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
      {subtitle || editor || dateLabel || comments > 0 || positiveReactions > 0 || hasChildren ? (
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
          <EntryReplyMenu entry={entry} objectName={kind} />
          <EntryActionsMenu entry={{ ...entry, objectName: kind }} compact showReplyAction={false} />
          {discussPath && comments > 0 ? (
            <Link to={discussPath}>
              <i className="fa fa-comment-o" aria-hidden="true"></i> {comments}
            </Link>
          ) : comments > 0 ? (
            <span>
              <i className="fa fa-comment-o" aria-hidden="true"></i> {comments}
            </span>
          ) : null}
          {positiveReactions > 0 ? (
            <span>
              <i className="fa fa-thumbs-o-up" aria-hidden="true"></i> {positiveReactions}
            </span>
          ) : null}
          {childCounts.map((child) => (
            <button
              key={child.key}
              type="button"
              className="btn btn-link wt-entry-child-count"
              onClick={() => setChildrenExpanded((value) => !value)}
              aria-expanded={childrenExpanded}
              title={`${childrenExpanded ? 'Hide' : 'Show'} ${child.count} ${child.label} in ${visibilityLabel(effectiveView).toLowerCase()}`}
            >
              <span className={child.icon} aria-hidden="true"></span> {child.count}
            </button>
          ))}
        </div>
      ) : null}
      {hasChildren && childrenExpanded ? <EntryChildrenPanel entryId={entry._id} kind={kind} /> : null}
    </div>
  );
};

export default EntryRowDetails;
