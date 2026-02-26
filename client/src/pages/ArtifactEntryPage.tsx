import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/common/Alert';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import EntryList from '../components/common/EntryList';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import apiService from '../services/api';
import type { LegacyEntity } from '../types/legacy';
import type { ArtifactEntryResponse } from '../types/api';
import type { Argument, Artifact, Issue, Opinion, Question } from '../types';

const ArtifactEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ArtifactEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtifactEntry = async () => {
      if (!id) {
        setError('Artifact ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = await apiService.getArtifactEntry(id);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artifact');
      } finally {
        setLoading(false);
      }
    };

    fetchArtifactEntry();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading artifact..." />;
  }

  if (error || !data?.artifact) {
    return <Alert type="danger">{error || 'Artifact not found'}</Alert>;
  }

  const artifact = data.artifact as LegacyEntity;
  const artifacts = (data.artifacts || []) as LegacyEntity[];
  const args = (data.arguments || []) as LegacyEntity[];
  const questions = (data.questions || []) as LegacyEntity[];
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];

  return (
    <div>
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Artifacts', url: '/artifacts' }, { title: artifact.title, active: true }]} />
      <PageHeader
        title={artifact.title}
        icon="picture-o"
        iconColor="text-primary"
        actions={
          <Link to={`/artifacts/edit/${artifact._id}`} className="btn btn-default">
            <i className="fa fa-pencil"></i> Edit
          </Link>
        }
      />

      <div className="text-body" style={{ marginTop: '20px' }}>
        <div dangerouslySetInnerHTML={{ __html: artifact.content || artifact.description || '' }} />
      </div>

      {artifacts.length > 0 && (
        <EntryList
          title="Artifacts"
          icon="paperclip"
          iconColor="text-muted"
          count={artifact.childrenCount?.artifacts?.accepted ?? artifacts.length}
        >
          {artifacts.map((childArtifact) => (
            <li key={childArtifact._id} className="list-group-item">
              <Link to={`/artifacts/entry/${(childArtifact as unknown as Artifact).friendlyUrl || childArtifact._id}/${childArtifact._id}`}>
                {childArtifact.title || '(Untitled)'}
              </Link>
            </li>
          ))}
        </EntryList>
      )}

      {args.length > 0 && (
        <EntryList
          title="Facts"
          icon="flash"
          iconColor="text-primary"
          count={artifact.childrenCount?.arguments?.accepted ?? args.length}
        >
          {args.map((arg) => (
            <ArgumentEntryRow key={arg._id} argument={arg as unknown as Argument} subtitle={false} />
          ))}
        </EntryList>
      )}

      {questions.length > 0 && (
        <EntryList
          title="Questions"
          icon="question-circle"
          iconColor="text-success-x"
          count={artifact.childrenCount?.questions?.accepted ?? questions.length}
        >
          {questions.map((question) => (
            <QuestionEntryRow key={question._id} question={question as unknown as Question} subtitle={false} />
          ))}
        </EntryList>
      )}

      {issues.length > 0 && (
        <EntryList
          title="Issues"
          icon="exclamation-triangle"
          iconColor="text-warning"
          count={artifact.childrenCount?.issues?.accepted ?? issues.length}
        >
          {issues.map((issue) => (
            <IssueEntryRow key={issue._id} issue={issue as unknown as Issue} subtitle={false} />
          ))}
        </EntryList>
      )}

      {opinions.length > 0 && (
        <EntryList
          title="Comments"
          icon="comment"
          iconColor="text-info"
          count={artifact.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      {artifact.source && (
        <p style={{ marginTop: '16px' }}>
          <strong>Source:</strong>{' '}
          <a href={artifact.source} target="_blank" rel="noopener noreferrer">
            {artifact.source}
          </a>
        </p>
      )}

      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {artifact.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Authored by: <strong>{artifact.editorUsername}</strong>
          </p>
        )}
        {artifact.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(artifact.editDate).toLocaleDateString()}
          </p>
        )}
        {artifact.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <Link to="/artifacts" className="btn btn-default" style={{ marginTop: '20px' }}>
        <i className="fa fa-arrow-left"></i> Back to Artifacts
      </Link>
    </div>
  );
};

export default ArtifactEntryPage;
