import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/common/Alert';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import EntryList from '../components/common/EntryList';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';
import type { LegacyEntity } from '../types/legacy';
import type { ArtifactEntryResponse } from '../types/api';
import type { Argument, Artifact, Issue, Opinion, Question } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import {
  EntryContextLine,
  EntryMetaBlock,
  EntryRelatedTopics,
  buildLegacyEntryBreadcrumb,
} from '../components/Entry/EntryLegacyParity';
import ArtifactQualityPanel from '../components/Artifacts/ArtifactQualityPanel';
import ArtifactSourceIntegrityPanel from '../components/Artifacts/ArtifactSourceIntegrityPanel';
import { ARTIFACT_TYPE_OPTIONS, ORIGIN_TYPE_OPTIONS } from '../constants/artifactOptions';

function formatFileSize(bytes?: number): string {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const scaled = size / (1024 ** unitIndex);
  const value = scaled >= 10 || unitIndex === 0 ? scaled.toFixed(0) : scaled.toFixed(1);
  return `${value} ${units[unitIndex]}`;
}

function formatFriendlyDate(value?: string | Date): string {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatFullDateTooltip(value?: string | Date): string {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const raw = typeof value === 'string' ? value : value.toISOString();
  return `${date.toString()} | UTC: ${date.toUTCString()} | Raw: ${raw}`;
}

const ArtifactEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ArtifactEntryResponse | null>(null);
  const [ancestorTopic, setAncestorTopic] = useState<LegacyEntity | null>(null);
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

  useEffect(() => {
    const parentId = String(data?.topic?.parentId || '').trim();
    const currentTopicId = String(data?.topic?._id || '').trim();

    if (!parentId || parentId === currentTopicId) {
      setAncestorTopic(null);
      return;
    }

    let cancelled = false;
    const fetchAncestorTopic = async () => {
      try {
        const result = await apiService.getTopicEntry(parentId);
        if (!cancelled) {
          setAncestorTopic((result.topic as LegacyEntity) || null);
        }
      } catch (_error) {
        if (!cancelled) {
          setAncestorTopic(null);
        }
      }
    };

    void fetchAncestorTopic();
    return () => {
      cancelled = true;
    };
  }, [data?.topic?._id, data?.topic?.parentId]);

  if (loading) {
    return <LoadingSpinner message="Loading artifact..." />;
  }

  if (error || !data?.artifact) {
    return <Alert type="danger">{error || 'Artifact not found'}</Alert>;
  }

  const artifact = data.artifact as LegacyEntity;
  const typedArtifact = artifact as unknown as Artifact;
  const provenance = typedArtifact.provenance || {};
  const artifacts = (data.artifacts || []) as LegacyEntity[];
  const args = (data.arguments || []) as LegacyEntity[];
  const questions = (data.questions || []) as LegacyEntity[];
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];
  const rawTopicLinks = data.topicLinks ?? artifact.topicLinks;
  const topicLinks = Array.isArray(rawTopicLinks) ? (rawTopicLinks as LegacyEntity[]) : [];
  const file = (artifact.file || {}) as { name?: string; type?: string; size?: number; lastModifiedDate?: string | Date };
  const fileName = String(file.name || '').trim();
  const fileType = String(file.type || '').trim();
  const filePath = String(artifact.filePath || (fileName ? `/media/artifacts/${artifact._id}_${fileName}` : '') || '');
  const thumbnailPath = String(
    artifact.thumbnailPath
      || ((fileType.toLowerCase().startsWith('image') && fileName) ? `/media/artifacts/${artifact._id}_thumbnail_${fileName}` : '')
      || '',
  );
  const hasMedia = Boolean(fileName && filePath);
  const detailsTab = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/artifacts/entry/${encodeURIComponent(String(artifact.friendlyUrl || artifact._id))}/${encodeURIComponent(String(artifact._id))}`,
    },
    {
      id: 'artifacts',
      title: 'Artifacts',
      icon: 'puzzle-piece',
      url: `/artifacts?artifact=${encodeURIComponent(String(artifact._id || ''))}`,
      count: Number(artifact.childrenCount?.artifacts?.accepted || 0),
    },
    {
      id: 'facts',
      title: 'Facts',
      icon: 'flash',
      url: `/arguments?artifact=${encodeURIComponent(String(artifact._id || ''))}`,
      count: Number(artifact.childrenCount?.arguments?.accepted || 0),
    },
    {
      id: 'questions',
      title: 'Questions',
      icon: 'question-circle',
      url: `/questions?artifact=${encodeURIComponent(String(artifact._id || ''))}`,
      count: Number(artifact.childrenCount?.questions?.accepted || 0),
    },
    {
      id: 'issues',
      title: 'Issues',
      icon: 'exclamation-circle',
      url: `/issues?artifact=${encodeURIComponent(String(artifact._id || ''))}`,
      count: Number(artifact.childrenCount?.issues?.accepted || 0),
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: 'comments-o',
      url: `/opinions?artifact=${encodeURIComponent(String(artifact._id || ''))}`,
      count: Number(artifact.childrenCount?.opinions?.accepted || 0),
    },
  ].filter((tab) => tab.id === 'details' || Number(tab.count || 0) > 0);
  const sectionTopic = (artifact.parentTopic || data.topic || null) as LegacyEntity | null;
  const grandParentTopic = (
    artifact.parentTopic?.parentTopic
    || ancestorTopic
    || null
  ) as LegacyEntity | null;
  const breadcrumbItems = buildLegacyEntryBreadcrumb(artifact, 'artifact', {
    sectionTopic,
    grandParentTopic,
  });
  const friendlyModifiedDate = formatFriendlyDate(file.lastModifiedDate);
  const fullModifiedDateTooltip = formatFullDateTooltip(file.lastModifiedDate);

  return (
    <div>
      <PageMeta title={artifact.title} description={artifact.description || artifact.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={artifact.title || 'artifact'} height={100} />
      <PageHeader
        title={artifact.title}
        icon="picture-o"
        iconColor="text-primary"
      />
      <EntryContextLine entry={artifact} objectName="artifact" />

      <EntryQuickActions
        entry={artifact}
        objectName="artifact"
        hasValue={Boolean(data?.hasValue)}
        moreActions={<EntryActionsMenu entry={artifact} editPath={`/artifacts/edit/${encodeURIComponent(artifact._id)}`} />}
      />
      <PageTabs tabs={detailsTab} activeTab="details" />

      <div className="text-body" style={{ marginTop: '20px' }}>
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(artifact.content || artifact.description || '') }} />
      </div>
      {hasMedia ? (
        <div className="text-body" style={{ marginTop: '10px' }}>
          {thumbnailPath ? (
            <div className="artifact-img">
              <a href={filePath} target="_blank" rel="noreferrer" title="Click to open original file">
                <img src={thumbnailPath} className="img-responsive" alt={artifact.title || 'Artifact media'} />
              </a>
            </div>
          ) : null}
          <p className="help-block">
            {fileName}{' '}
            <a href={filePath} className="no-underline" target="_blank" rel="noreferrer" title="Click to open/download original file">
              <i className="fa fa-download"></i> Download
            </a>
            <br />
            <small style={{ marginBottom: '10px', display: 'inline-block' }} className="text-muted-2">
              {fileType || 'file'} • {formatFileSize(file.size)}
              {friendlyModifiedDate ? (
                <>
                  {' • '}
                  <span title={fullModifiedDateTooltip}>
                    {friendlyModifiedDate}
                  </span>
                </>
              ) : null}
            </small>
          </p>
        </div>
      ) : null}

      <section className="panel panel-default" style={{ marginTop: 16 }} aria-labelledby="artifact-provenance-heading">
        <div className="panel-heading"><strong id="artifact-provenance-heading">Evidence Provenance</strong></div>
        <div className="panel-body">
          <dl className="dl-horizontal" style={{ marginBottom: 0 }}>
            <dt>Artifact kind</dt>
            <dd>{ARTIFACT_TYPE_OPTIONS.find((option) => option.value === typedArtifact.artifactType)?.label || 'Other'}</dd>
            <dt>Origin</dt>
            <dd>{ORIGIN_TYPE_OPTIONS.find((option) => option.value === provenance.originType)?.label || 'Unknown origin'}</dd>
            <dt>Creator</dt><dd>{provenance.creator || 'Unknown'}</dd>
            <dt>Publisher</dt><dd>{provenance.publisher || 'Unknown'}</dd>
            <dt>Published</dt><dd>{formatFriendlyDate(provenance.publicationDate) || 'Unknown'}</dd>
            <dt>Captured</dt><dd>{formatFriendlyDate(provenance.captureDate) || 'Unknown'}</dd>
            {provenance.archiveUrl ? <><dt>Archive</dt><dd><a href={provenance.archiveUrl} target="_blank" rel="noreferrer">{provenance.archiveUrl}</a></dd></> : null}
            {provenance.checksum ? <><dt>Checksum</dt><dd><code>{provenance.checksum}</code></dd></> : null}
            {provenance.accessLimitations ? <><dt>Access limits</dt><dd>{provenance.accessLimitations}</dd></> : null}
            {provenance.verifiabilityNotes ? <><dt>Verification</dt><dd>{provenance.verifiabilityNotes}</dd></> : null}
          </dl>
        </div>
      </section>
      <ArtifactSourceIntegrityPanel
        artifactId={artifact._id}
        sourceUrl={String(artifact.source || provenance.archiveUrl || '')}
        initialIntegrity={provenance.sourceIntegrity ? { status: provenance.sourceIntegrity.status || 'unchecked', ...provenance.sourceIntegrity } : undefined}
      />
      <ArtifactQualityPanel artifactId={artifact._id} initialQuality={provenance.sourceQuality} />
      <EntryRelatedTopics entry={artifact} topicLinks={topicLinks} />

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

      <EntryMetaBlock entry={artifact} />

      <Link to="/artifacts" className="btn btn-default" style={{ marginTop: '20px' }}>
        <i className="fa fa-arrow-left"></i> Back to Artifacts
      </Link>
    </div>
  );
};

export default ArtifactEntryPage;
