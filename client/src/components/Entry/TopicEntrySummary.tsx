import React from 'react';
import type { LegacyEntity } from '../../types/legacy';
import { EntryContextLine } from './EntryLegacyParity';

interface TopicEntrySummaryProps {
  topic: LegacyEntity;
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
      <div className="wt-entry-labels" style={{ marginBottom: '8px' }}>
        {topic.screening?.status === 0 ? (
          <span className="label label-warning" style={{ marginRight: '6px' }}>
            <i className="fa fa-question-circle" aria-hidden="true"></i> Pending
          </span>
        ) : null}
        {verdictLabels.map((label) =>
          label.count > 0 ? (
            <span
              key={label.key}
              className={`label label-${label.theme}`}
              style={{ marginRight: '6px' }}
              title={label.title}
            >
              <i className={`fa fa-${label.icon}`} aria-hidden="true"></i> {label.count}
            </span>
          ) : null,
        )}
        {labels.map(({ tag, text }, index) => (
          <span
            key={String(tag.code || `tag-${index}`)}
            className={`label label-${String(tag.theme || 'info')}`}
            style={{ marginRight: '6px' }}
          >
            <i className="fa fa-tag" aria-hidden="true"></i> {text}
          </span>
        ))}
        {isMainTopic && !hasMainLabel ? (
          <span className="label label-info" style={{ marginRight: '6px' }}>
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
