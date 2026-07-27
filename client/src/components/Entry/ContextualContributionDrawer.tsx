import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import type { LegacyEntity } from '../../types/legacy';

type SupportedObjectName = 'topic' | 'argument' | 'question' | 'answer' | 'issue' | 'opinion' | 'artifact';
type ContributionKind = 'comment' | 'issue' | 'fact' | 'question' | 'answer' | 'artifact' | 'topic';
type OpinionClassification = 'general' | 'supplement' | 'objection' | 'question';

interface ContextualContributionDrawerProps {
  entry: LegacyEntity;
  objectName: SupportedObjectName;
  topicId: string;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}

const FULL_EDITOR: Record<ContributionKind, string> = {
  comment: '/opinions/create', issue: '/issues/create', fact: '/arguments/create', question: '/questions/create',
  answer: '/answers/create', artifact: '/artifacts/create', topic: '/topics/create',
};

function responseEntryId(response: Record<string, unknown>, kind: ContributionKind): string {
  const key = kind === 'comment' ? 'opinion' : kind === 'fact' ? 'argument' : kind;
  const entry = response[key] as { _id?: unknown } | undefined;
  return String(entry?._id || '');
}

const ContextualContributionDrawer: React.FC<ContextualContributionDrawerProps> = ({
  entry, objectName, topicId, onClose, onSubmitted,
}) => {
  const entryId = String(entry._id || '');
  const questionId = objectName === 'question' ? entryId : String(entry.parentQuestion?._id || entry.questionId || '');
  const options = useMemo(() => {
    const values: Array<{ value: ContributionKind; label: string }> = [
      { value: 'comment', label: 'Comment' },
      { value: 'issue', label: 'Issue' },
    ];
    if (questionId) values.push({ value: 'answer', label: 'Answer' });
    if (topicId) values.push(
      { value: 'fact', label: 'Fact or argument' },
      { value: 'question', label: 'Question' },
      { value: 'artifact', label: 'Artifact or source' },
      { value: 'topic', label: 'Subtopic' },
    );
    return values;
  }, [questionId, topicId]);
  const [kind, setKind] = useState<ContributionKind>('comment');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [classification, setClassification] = useState<OpinionClassification>('general');
  const [source, setSource] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const contextQuery = `${encodeURIComponent(objectName)}=${encodeURIComponent(entryId)}`;
  const fullEditorPath = kind === 'topic'
    ? `${FULL_EDITOR[kind]}?topic=${encodeURIComponent(topicId || entryId)}`
    : `${FULL_EDITOR[kind]}?${contextQuery}`;

  const submit = async () => {
    if (title.trim().length < 3 || content.trim().length < 10) {
      setError('Use a title of at least 3 characters and details of at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let response: Record<string, unknown>;
      const common = { title: title.trim(), description: content.trim(), private: isPrivate };
      switch (kind) {
        case 'comment':
          response = await apiService.createOpinion({ ...common, topicId: topicId || undefined, parentId: entryId, parentType: objectName, classification });
          break;
        case 'issue':
          response = await apiService.createIssue({ ...common, ownerId: entryId, ownerType: objectName, categoryId: topicId || undefined });
          break;
        case 'fact':
          response = await apiService.createArgument({ ...common, topicId, typeId: 1 });
          break;
        case 'question':
          response = await apiService.createQuestion({ ...common, topicId });
          break;
        case 'answer':
          response = await apiService.createAnswer({ ...common, questionId });
          break;
        case 'artifact':
          response = await apiService.createArtifact({ ...common, topicId, source: source.trim() });
          break;
        case 'topic':
          response = await apiService.createTopic({ ...common, parentId: topicId || entryId, topicId: topicId || entryId });
          break;
      }
      const createdId = responseEntryId(response, kind);
      onSubmitted(`${kind === 'comment' ? 'Comment' : kind.charAt(0).toUpperCase() + kind.slice(1)} submitted for screening${createdId ? ` (${createdId})` : ''}.`);
      setTitle('');
      setContent('');
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit contribution');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="panel panel-info" aria-label="Quick contribution">
      <div className="panel-heading"><strong>Contribute in context</strong></div>
      <div className="panel-body">
        <p className="text-muted">Create a concise contribution here. It will follow the normal screening workflow.</p>
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        <div className="row">
          <div className="col-sm-4 form-group">
            <label htmlFor={`quick-contribution-kind-${entryId}`}>Type</label>
            <select id={`quick-contribution-kind-${entryId}`} className="form-control" value={kind} onChange={(event) => setKind(event.target.value as ContributionKind)}>
              {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </div>
          {kind === 'comment' ? (
            <div className="col-sm-4 form-group">
              <label htmlFor={`quick-contribution-classification-${entryId}`}>Purpose</label>
              <select id={`quick-contribution-classification-${entryId}`} className="form-control" value={classification} onChange={(event) => setClassification(event.target.value as OpinionClassification)}>
                <option value="general">General comment</option>
                <option value="supplement">Supplement</option>
                <option value="objection">Objection</option>
                <option value="question">Clarifying question</option>
              </select>
            </div>
          ) : null}
        </div>
        <div className="form-group">
          <label htmlFor={`quick-contribution-title-${entryId}`}>Title</label>
          <input id={`quick-contribution-title-${entryId}`} className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor={`quick-contribution-content-${entryId}`}>Details</label>
          <textarea id={`quick-contribution-content-${entryId}`} className="form-control" rows={4} value={content} onChange={(event) => setContent(event.target.value)} />
        </div>
        {kind === 'artifact' ? (
          <div className="form-group">
            <label htmlFor={`quick-contribution-source-${entryId}`}>Source URL</label>
            <input id={`quick-contribution-source-${entryId}`} type="url" className="form-control" value={source} onChange={(event) => setSource(event.target.value)} />
          </div>
        ) : null}
        <div className="checkbox"><label><input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} /> Private contribution</label></div>
        <button type="button" className="btn btn-info" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Submitting...' : 'Submit for screening'}</button>{' '}
        <Link className="btn btn-default" to={fullEditorPath}>Full editor</Link>{' '}
        <button type="button" className="btn btn-link" onClick={onClose}>Cancel</button>
      </div>
    </aside>
  );
};

export default ContextualContributionDrawer;
