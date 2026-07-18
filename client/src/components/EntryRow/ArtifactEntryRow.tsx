import React from 'react';
import type { Artifact } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';

interface ArtifactEntryRowProps {
  artifact: Artifact;
  subtitle?: boolean;
  labels?: boolean;
  contentPreview?: string;
  showMore?: boolean;
  hideAcceptedStatus?: boolean;
}

const ArtifactEntryRow: React.FC<ArtifactEntryRowProps> = ({
  artifact,
  subtitle = false,
  labels = true,
  contentPreview,
  showMore = false,
  hideAcceptedStatus = false,
}) => {
  const friendly = encodeURIComponent(String(artifact.friendlyUrl || artifact._id || ''));
  const id = encodeURIComponent(String(artifact._id || ''));
  const entryPath = `/artifacts/entry/${friendly || id}/${id}`;

  return (
    <li
      className="list-group-item"
      data-id={artifact._id}
      data-type="artifact"
      data-private={artifact.private}
    >
      <i className="fa fa-puzzle-piece text-primary" aria-hidden="true"></i>
      <EntryRowDetails
        entry={artifact as unknown as LegacyEntity}
        kind="artifact"
        entryPath={entryPath}
        labels={labels}
        subtitle={subtitle}
        contentPreview={contentPreview}
        showMore={showMore}
        hideAcceptedStatus={hideAcceptedStatus}
      />
    </li>
  );
};

export default ArtifactEntryRow;
