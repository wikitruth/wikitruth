import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import apiService from '../../services/api';
import type { EntityBuckets } from '../../types/api';
import type { LegacyEntity } from '../../types/legacy';
import type { EntryRowKind } from './EntryRowDetails';
import { getEntryRowPath } from './entryRowPaths';
import { useContentVisibility } from '../../context/ContentVisibilityContext';
import { visibilityLabel } from '../../utils/contentVisibility';

type EntryChildrenPanelProps = {
  entryId: string;
  kind: EntryRowKind;
};

const GROUPS: Array<{
  key: keyof EntityBuckets;
  kind: EntryRowKind;
  label: string;
  icon: string;
}> = [
  { key: 'topics', kind: 'topic', label: 'Topics', icon: 'fa fa-folder-open' },
  { key: 'arguments', kind: 'argument', label: 'Facts', icon: 'glyphicon glyphicon-flash' },
  { key: 'questions', kind: 'question', label: 'Questions', icon: 'fa fa-question-circle' },
  { key: 'answers', kind: 'answer', label: 'Answers', icon: 'fa fa-check-circle-o' },
  { key: 'artifacts', kind: 'artifact', label: 'Artifacts', icon: 'fa fa-puzzle-piece' },
  { key: 'issues', kind: 'issue', label: 'Issues', icon: 'fa fa-exclamation-circle' },
  { key: 'opinions', kind: 'opinion', label: 'Comments', icon: 'fa fa-comments-o' },
];

const EntryChildrenPanel: React.FC<EntryChildrenPanelProps> = ({ entryId, kind }) => {
  const [children, setChildren] = useState<EntityBuckets | null>(null);
  const [error, setError] = useState(false);
  const { effectiveView } = useContentVisibility();

  useEffect(() => {
    let mounted = true;
    setChildren(null);
    setError(false);
    void apiService.getEntryChildren(kind, entryId, effectiveView)
      .then((response) => {
        if (mounted) setChildren(response);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [effectiveView, entryId, kind]);

  const visibleGroups = useMemo(
    () => GROUPS.map((group) => ({
      ...group,
      entries: (children?.[group.key] || []) as LegacyEntity[],
    })).filter((group) => group.entries.length > 0),
    [children],
  );

  if (error) {
    return <div className="wt-entry-children-message text-muted">Unable to load replies.</div>;
  }
  if (!children) {
    return <div className="wt-entry-children-message text-muted">Loading replies…</div>;
  }
  if (visibleGroups.length === 0) {
    return <div className="wt-entry-children-message text-muted">No replies in {visibilityLabel(effectiveView).toLowerCase()}.</div>;
  }

  return (
    <div className="wt-entry-children" aria-label="Entry replies">
      {visibleGroups.map((group) => (
        <section key={group.key} className="wt-entry-children-group">
          <h4><span className={group.icon} aria-hidden="true"></span> {group.label}</h4>
          <ul className="list-unstyled">
            {group.entries.map((child) => (
              <li key={child._id}>
                <Link to={getEntryRowPath(child, group.kind)}>{child.title || '(Untitled)'}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default EntryChildrenPanel;
