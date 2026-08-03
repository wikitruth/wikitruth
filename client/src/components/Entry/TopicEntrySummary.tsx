import React from 'react';
import type { LegacyEntity } from '../../types/legacy';
import { EntryContextLine } from './EntryLegacyParity';
import EntryVerdictStatus from './EntryVerdictStatus';

interface TopicEntrySummaryProps {
  topic: LegacyEntity;
  entry?: LegacyEntity;
  parentTopic?: LegacyEntity | null;
  tagLabels?: LegacyEntity[];
  verdict?: LegacyEntity;
  linkCount?: number;
  isMainTopic?: boolean;
}

type VerdictCounts = {
  true?: unknown;
  pending?: unknown;
  false?: unknown;
};

function positiveCount(value: unknown): number {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

const TopicEntrySummary: React.FC<TopicEntrySummaryProps> = ({
  topic,
  entry,
  parentTopic,
  tagLabels = [],
  verdict,
  linkCount,
  isMainTopic = false,
}) => {
  const counts = (verdict?.counts || {}) as VerdictCounts;
  const verdictLabels = [
    { key: 'true', count: positiveCount(counts.true), theme: 'success', icon: 'check-circle', title: 'verified' },
    { key: 'pending', count: positiveCount(counts.pending), theme: 'warning', icon: 'question-circle', title: 'unverified' },
    { key: 'false', count: positiveCount(counts.false), theme: 'danger', icon: 'close', title: 'false' },
  ];
  const hasVerdictCounts = verdictLabels.some((label) => label.count > 0);
  const labels = tagLabels
    .map((tag) => ({ tag, text: String(tag.text || tag.label || tag.title || '').trim() }))
    .filter(({ text }) => Boolean(text));
  const hasMainLabel = labels.some(({ text }) => text.toLowerCase() === 'main');

  return (
    <>
      <EntryContextLine
        entry={{ ...topic, parentTopic: parentTopic || topic.parentTopic }}
        objectName="topic"
      />
      <div className="wt-entry-labels">
        {topic.screening?.status === 0 ? (
          <span className="label label-warning" title="Screening status: Pending">
            <i className="fa fa-question-circle" aria-hidden="true"></i> Pending
          </span>
        ) : null}
        <EntryVerdictStatus entry={entry || topic} />
        {hasVerdictCounts ? (
          <span className="wt-entry-verdict-counts" aria-label="Fact verdict counts">
            <span className="wt-entry-verdict-counts-label">Facts:</span>
            {verdictLabels.map((label) =>
              label.count > 0 ? (
                <span
                  key={label.key}
                  className={`label label-${label.theme}`}
                  title={`${label.count} ${label.title} fact${label.count === 1 ? '' : 's'}`}
                >
                  <i className={`fa fa-${label.icon}`} aria-hidden="true"></i> {label.count}
                </span>
              ) : null,
            )}
          </span>
        ) : null}
        {labels.map(({ tag, text }, index) => (
          <span
            key={String(tag.code || `tag-${index}`)}
            className={`label label-${String(tag.theme || 'info')}`}
          >
            <i className="fa fa-tag" aria-hidden="true"></i> {text}
          </span>
        ))}
        {isMainTopic && !hasMainLabel ? (
          <span className="label label-info">
            <i className="fa fa-tag" aria-hidden="true"></i> Main
          </span>
        ) : null}
        {positiveCount(linkCount) > 0 ? (
          <span className="label label-info" title="Linked contexts">
            <i className="fa fa-link" aria-hidden="true"></i> {positiveCount(linkCount)}
          </span>
        ) : null}
      </div>
    </>
  );
};

export default TopicEntrySummary;
