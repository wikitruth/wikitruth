import React from 'react';
import { Link } from 'react-router-dom';
import type { Artifact } from '../../types';

interface ArtifactEntryRowProps {
  artifact: Artifact;
  subtitle?: boolean;
  labels?: boolean;
  contentPreview?: string;
  showMore?: boolean;
}

type ArtifactWithLegacyFields = Artifact & {
  contentPreview?: string;
  showMore?: boolean;
  thumbnailPath?: string;
  filePath?: string;
  comments?: number;
};

const ArtifactEntryRow: React.FC<ArtifactEntryRowProps> = ({
  artifact,
  subtitle = false,
  labels = false,
  contentPreview,
  showMore = false,
}) => {
  const extended = artifact as ArtifactWithLegacyFields;
  const friendly = encodeURIComponent(String(artifact.friendlyUrl || artifact._id || ''));
  const id = encodeURIComponent(String(artifact._id || ''));
  const entryPath = `/artifacts/entry/${friendly || id}/${id}`;
  const preview = String(contentPreview || extended.contentPreview || artifact.description || '').trim();

  return (
    <li className="list-group-item" data-id={artifact._id} data-type="artifact" data-private={artifact.private}>
      <i className="fa fa-puzzle-piece text-primary" aria-hidden="true"></i>
      <div>
        <Link to={entryPath}>
          {artifact.title || '(Untitled)'}
          {labels && artifact.private ? <span className="label label-default"> private</span> : null}
          {labels && artifact.screening?.status ? (
            <span className="label label-info" style={{ marginLeft: 6 }}>
              {String(artifact.screening.status)}
            </span>
          ) : null}
        </Link>
        {subtitle ? (
          <div className="text-muted">
            <small>
              {artifact.editorUsername ? (
                <>
                  <i className="fa fa-user"></i> {artifact.editorUsername}
                </>
              ) : null}
              {artifact.editDate ? (
                <>
                  {' '}
                  <i className="fa fa-clock-o"></i> {new Date(artifact.editDate).toLocaleDateString()}
                </>
              ) : null}
            </small>
          </div>
        ) : null}
        {preview ? (
          <div className="wt-entry-row-content">
            {preview}
            {showMore || extended.showMore ? (
              <>
                {' '}
                <a href="#" className="wt-show-more">
                  Show More
                </a>
              </>
            ) : null}
          </div>
        ) : null}
        {extended.thumbnailPath ? (
          <div className="artifact-img" style={{ marginBottom: 5 }}>
            <a href={extended.filePath || extended.thumbnailPath} target="_blank" rel="noreferrer" title="Open original file">
              <img src={extended.thumbnailPath} className="img-responsive" alt={artifact.title || 'Artifact'} style={{ maxHeight: 128 }} />
            </a>
          </div>
        ) : null}
      </div>
      <span className="pull-right text-muted hidden-xxs">
        <span className="glyphicon glyphicon-comment" aria-hidden="true"></span>{' '}
        {Number(extended.comments || 0)}
      </span>
    </li>
  );
};

export default ArtifactEntryRow;
