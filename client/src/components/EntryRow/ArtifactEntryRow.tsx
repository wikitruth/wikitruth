import React from 'react';
import type { Artifact } from '../../types';
import type { LegacyEntity } from '../../types/legacy';
import EntryRowDetails from './EntryRowDetails';
import EntryRowShell from './EntryRowShell';

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
    <EntryRowShell
      entryId={artifact._id}
      entryType="artifact"
      iconClassName="fa fa-puzzle-piece text-primary"
      isPrivate={artifact.private}
    >
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
    </EntryRowShell>
  );
};

export default ArtifactEntryRow;
