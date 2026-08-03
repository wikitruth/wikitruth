import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import GeoPatternBackground from '../components/common/GeoPatternBackground';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import type { ArgumentEntryResponse } from '../types/api';
import type { LegacyEntity } from '../types/legacy';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import EntryList from '../components/common/EntryList';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import EntryQuickActions from '../components/Entry/EntryQuickActions';
import PageMeta from '../components/common/PageMeta';
import type { Issue, Opinion, Question } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import {
  EntryContextLine,
  EntryMetaBlock,
  EntryRelatedTopics,
  buildLegacyEntryBreadcrumb,
} from '../components/Entry/EntryLegacyParity';
import TruthSummaryPanel from '../components/Entry/TruthSummaryPanel';
import EntryVerdictStatus from '../components/Entry/EntryVerdictStatus';

const ArgumentEntryPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ArgumentEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkTitleDraft, setLinkTitleDraft] = useState('');
  const [supportsParent, setSupportsParent] = useState(true);
  const [linkMutationBusy, setLinkMutationBusy] = useState(false);
  const [linkMutationError, setLinkMutationError] = useState<string | null>(null);
  const [linkMutationSuccess, setLinkMutationSuccess] = useState<string | null>(null);
  const argumentLinkId = String(searchParams.get('argumentLink') || searchParams.get('id') || '').trim();
  const mode = String(searchParams.get('mode') || '').trim().toLowerCase();
  const isArgumentLinkMode = Boolean(argumentLinkId);
  const isArgumentLinkEditMode = isArgumentLinkMode && mode === 'edit-link';

  const fetchArgumentEntry = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const result = await apiService.getArgumentEntry(id, {
        argumentLink: argumentLinkId || undefined,
        mode: mode || undefined,
        id: argumentLinkId || undefined,
      });
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching argument entry:', err);
      setError('Failed to load argument');
      setLoading(false);
    }
  }, [argumentLinkId, id, mode]);

  useEffect(() => {
    void fetchArgumentEntry();
  }, [fetchArgumentEntry]);

  useEffect(() => {
    const entry = (data?.entry || null) as LegacyEntity | null;
    if (entry?.objectName === 'argumentLink') {
      setLinkTitleDraft(String(entry.title || ''));
      setSupportsParent(!entry.against);
    } else {
      setLinkTitleDraft('');
      setSupportsParent(true);
    }
  }, [data?.entry]);

  if (loading) {
    return <LoadingSpinner message="Loading argument..." />;
  }

  if (error || !data?.argument) {
    return <Alert type="danger">{error || 'Argument not found'}</Alert>;
  }

  const argument = data.argument as LegacyEntity;
  const entry = ((data.entry || data.argument || {}) as LegacyEntity);
  const questions = (data.questions || []) as LegacyEntity[];
  const issues = (data.issues || []) as LegacyEntity[];
  const opinions = (data.opinions || []) as LegacyEntity[];
  const entryObjectName = String(entry.objectName || argument.objectName || 'argument').trim() || 'argument';
  const isArgumentLinkEntry = entryObjectName === 'argumentLink';
  const quickActionObjectName = 'argument' as const;
  
  // Build breadcrumb items
  const breadcrumbItems = buildLegacyEntryBreadcrumb(argument, 'argument', {
    sectionTopic: (data.topic || argument.parentTopic || null) as LegacyEntity | null,
    grandParentTopic: (data.parentTopic || data.grandParentTopic || null) as LegacyEntity | null,
    parentArgument: (argument.parentArgument || null) as LegacyEntity | null,
  });

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      icon: 'info-circle',
      url: `/arguments/entry/${encodeURIComponent(String(argument.friendlyUrl || argument._id))}/${encodeURIComponent(String(argument._id))}`,
    },
    {
      id: 'facts',
      title: 'Facts',
      icon: 'flash',
      url: `/arguments?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.arguments?.accepted || 0),
    },
    {
      id: 'questions',
      title: 'Questions',
      icon: 'question-circle',
      url: `/questions?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.questions?.accepted || 0),
    },
    {
      id: 'issues',
      title: 'Issues',
      icon: 'exclamation-circle',
      url: `/issues?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.issues?.accepted || 0),
    },
    {
      id: 'comments',
      title: 'Comments',
      icon: 'comments-o',
      url: `/opinions?argument=${encodeURIComponent(String(argument._id || ''))}`,
      count: Number(argument.childrenCount?.opinions?.accepted || 0),
    },
  ].filter((tab) => tab.id === 'details' || Number(tab.count || 0) > 0);

  const refreshArgumentEntry = async () => {
    if (!id) {
      return;
    }
    const refreshed = await apiService.getArgumentEntry(id, {
      argumentLink: argumentLinkId || undefined,
      mode: mode || undefined,
      id: argumentLinkId || undefined,
    });
    setData(refreshed);
  };

  const handleUpdateArgumentLink = async () => {
    if (!argumentLinkId) {
      return;
    }
    try {
      setLinkMutationBusy(true);
      setLinkMutationError(null);
      setLinkMutationSuccess(null);
      await apiService.updateArgumentLink(argumentLinkId, {
        title: linkTitleDraft.trim(),
        supportsParent: supportsParent,
      });
      await refreshArgumentEntry();
      setLinkMutationSuccess('Link updated.');
    } catch (mutationError) {
      setLinkMutationError(mutationError instanceof Error ? mutationError.message : 'Failed to update link');
    } finally {
      setLinkMutationBusy(false);
    }
  };

  const handleDeleteArgumentLink = async () => {
    if (!argumentLinkId) {
      return;
    }
    if (!window.confirm('Delete this link? This action cannot be undone.')) {
      return;
    }
    try {
      setLinkMutationBusy(true);
      setLinkMutationError(null);
      setLinkMutationSuccess(null);
      await apiService.deleteArgumentLink(argumentLinkId);
      navigate('/arguments');
    } catch (mutationError) {
      setLinkMutationError(mutationError instanceof Error ? mutationError.message : 'Failed to delete link');
      setLinkMutationBusy(false);
    }
  };

  return (
    <div>
      <PageMeta title={argument.title} description={argument.description || argument.contentPreview} />
      <Breadcrumb items={breadcrumbItems} />
      <GeoPatternBackground seed={argument.title || 'argument'} height={100} />
      
      <PageHeader 
        title={String((isArgumentLinkEntry ? entry.title2 || entry.title : argument.title) || argument.title)}
        subtitle={argument.subtitle}
        icon={isArgumentLinkEntry ? 'link' : 'flash'}
        iconColor="text-primary"
      />
      <EntryContextLine entry={argument} objectName="argument" />
      <div className="wt-entry-labels">
        <EntryVerdictStatus entry={entry} />
      </div>

      <TruthSummaryPanel objectName="argument" objectId={String(argument._id || '')} />

      <EntryQuickActions
        entry={entry}
        objectName={quickActionObjectName}
        hasValue={Boolean(data?.hasValue)}
        moreActions={
          <EntryActionsMenu
            entry={entry}
            editPath={
              isArgumentLinkEntry
                ? undefined
                : `/arguments/create?id=${encodeURIComponent(argument._id)}`
            }
          />
        }
      />

      {isArgumentLinkEditMode && isArgumentLinkEntry && (
        <div className="panel panel-default" style={{ marginTop: '12px' }}>
          <div className="panel-heading">
            <strong>Edit Link</strong>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label htmlFor="argument-link-title">Contextual Title</label>
              <input
                id="argument-link-title"
                className="form-control"
                value={linkTitleDraft}
                onChange={(event) => setLinkTitleDraft(event.target.value)}
                placeholder="Optional contextual title"
                disabled={linkMutationBusy}
              />
            </div>
            <div className="form-group">
              <label>Correlation To Parent</label>
              <div className="radio">
                <label className="text-success">
                  <input
                    type="radio"
                    checked={supportsParent}
                    onChange={() => setSupportsParent(true)}
                    disabled={linkMutationBusy}
                  />{' '}
                  Supporting argument (for)
                </label>
              </div>
              <div className="radio">
                <label className="text-primary">
                  <input
                    type="radio"
                    checked={!supportsParent}
                    onChange={() => setSupportsParent(false)}
                    disabled={linkMutationBusy}
                  />{' '}
                  Opposing argument (against)
                </label>
              </div>
            </div>
            {linkMutationError ? <Alert type="danger">{linkMutationError}</Alert> : null}
            {linkMutationSuccess ? <Alert type="success">{linkMutationSuccess}</Alert> : null}
            <div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleUpdateArgumentLink}
                disabled={linkMutationBusy}
              >
                {linkMutationBusy ? 'Saving...' : 'Update'}
              </button>{' '}
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeleteArgumentLink}
                disabled={linkMutationBusy}
              >
                Delete Link
              </button>
            </div>
          </div>
        </div>
      )}
      
      <PageTabs tabs={tabs} activeTab="details" />

      {/* Argument content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {argument.content ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(argument.content) }} />
        ) : argument.description && (
          <p className="lead">{argument.description}</p>
        )}
      </div>
      <EntryRelatedTopics entry={argument} topicLinks={data.topicLinks} />

      {questions.length > 0 && (
        <EntryList
          title="Questions"
          icon="question-circle"
          iconColor="text-success-x"
          count={argument.childrenCount?.questions?.accepted ?? questions.length}
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
          count={argument.childrenCount?.issues?.accepted ?? issues.length}
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
          count={argument.childrenCount?.opinions?.accepted ?? opinions.length}
        >
          {opinions.map((opinion) => (
            <OpinionEntryRow key={opinion._id} opinion={opinion as unknown as Opinion} subtitle={false} />
          ))}
        </EntryList>
      )}

      <EntryMetaBlock entry={argument} />

      <div style={{ marginTop: '30px' }}>
        <Link to="/arguments" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Arguments
        </Link>
      </div>
    </div>
  );
};

export default ArgumentEntryPage;
