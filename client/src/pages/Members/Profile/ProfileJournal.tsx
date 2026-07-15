import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ProfileShell from '../../../components/Members/ProfileShell';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';
import type { MemberJournalResponse } from '../../../types/api';
import TopicEntryRow from '../../../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../../../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../../../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../../../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../../../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../../../components/EntryRow/OpinionEntryRow';
import type { Answer, Argument, Issue, Opinion, Question, Topic } from '../../../types';

const ProfileJournal: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const username = routeUsername || user?.username || '';
  const tab = (searchParams.get('tab') || 'all').toLowerCase();
  const [data, setData] = useState<MemberJournalResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOwnProfile = useMemo(() => Boolean(user?.username && username && user.username === username), [user?.username, username]);
  const canViewJournal = isOwnProfile || Boolean(user?.roles?.admin);

  useEffect(() => {
    const loadJournal = async () => {
      if (isAuthLoading) {
        setLoading(true);
        return;
      }

      if (!username) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      if (!canViewJournal) {
        setData({});
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await apiService.getMemberJournal(username, tab);
        setData(result || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load journal');
      } finally {
        setLoading(false);
      }
    };

    void loadJournal();
  }, [canViewJournal, isAuthLoading, tab, username]);

  const sections = useMemo(
    () => [
      { key: 'topics', label: 'Topics', icon: 'folder-open', entries: (data.topics || []) as LegacyEntity[], more: Boolean(data.topicsMore) },
      { key: 'arguments', label: 'Facts', icon: 'flash', entries: (data.arguments || []) as LegacyEntity[], more: Boolean(data.argumentsMore) },
      { key: 'questions', label: 'Questions', icon: 'question-circle', entries: (data.questions || []) as LegacyEntity[], more: Boolean(data.questionsMore) },
      { key: 'answers', label: 'Answers', icon: 'check-circle-o', entries: (data.answers || []) as LegacyEntity[], more: Boolean(data.answersMore) },
      { key: 'artifacts', label: 'Artifacts', icon: 'puzzle-piece', entries: (data.artifacts || []) as LegacyEntity[], more: Boolean(data.artifactsMore) },
      { key: 'issues', label: 'Issues', icon: 'exclamation-circle', entries: (data.issues || []) as LegacyEntity[], more: Boolean(data.issuesMore) },
      { key: 'opinions', label: 'Comments', icon: 'comments-o', entries: (data.opinions || []) as LegacyEntity[], more: Boolean(data.opinionsMore) },
    ],
    [data],
  );

  const categories = (data.categories || []) as LegacyEntity[];

  if (isAuthLoading || loading) {
    return <LoadingSpinner message="Loading journal..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  if (!canViewJournal) {
    const returnUrl = `/members/${encodeURIComponent(username)}/journal`;
    return (
      <ProfileShell username={username} activeTab="journal" isOwnProfile={false}>
        <div style={{ marginTop: '15px' }}>
          <Alert type="info">
            This journal is private. Only the profile owner or an administrator can view it.
          </Alert>
          {!user && (
            <Link to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} className="btn btn-primary">
              <i className="fa fa-sign-in" aria-hidden="true"></i> Sign in
            </Link>
          )}
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell username={username} activeTab="journal" isOwnProfile={isOwnProfile}>
      <div style={{ marginTop: '15px' }}>
        <div className="alert alert-info">
          My Journal keeps private entries that only you (or an admin) can access.
        </div>

        {categories.length > 0 && (
          <div className="panel panel-default">
            <div className="panel-heading">
              <strong>Journal Categories</strong>
            </div>
            <div className="panel-body">
              <ul className="list-inline" style={{ marginBottom: 0 }}>
                {categories.slice(0, 12).map((category) => (
                  <li key={String(category._id)} style={{ marginBottom: '6px' }}>
                    <Link to={`/topics/entry/${category.friendlyUrl || category._id}/${category._id}`}>
                      {category.title || '(Untitled)'}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <ul className="nav nav-tabs wt-tabs" role="tablist">
          <li role="presentation" className={tab === 'all' ? 'active' : ''}>
            <a
              href="#all"
              onClick={(event) => {
                event.preventDefault();
                const next = new URLSearchParams(searchParams);
                next.set('tab', 'all');
                setSearchParams(next);
              }}
            >
              <i className="fa fa-globe" aria-hidden="true"></i> All
            </a>
          </li>
          {sections.map((section) => (
            <li key={section.key} role="presentation" className={tab === section.key ? 'active' : ''}>
              <a
                href={`#${section.key}`}
                onClick={(event) => {
                  event.preventDefault();
                  const next = new URLSearchParams(searchParams);
                  next.set('tab', section.key);
                  setSearchParams(next);
                }}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>

        {!data.results && <p className="text-muted" style={{ marginTop: '15px' }}>No journal entries found.</p>}

        {sections
          .filter((section) => tab === 'all' || tab === section.key)
          .map((section) => (
            <div key={section.key} style={{ marginTop: '20px' }}>
              {section.entries.length === 0 ? (
                <p className="text-muted">No {section.label.toLowerCase()} yet.</p>
              ) : (
                <>
                  <h3 className="page-header-x text-muted-0">
                    <i className={`fa fa-${section.icon}`}></i> {section.label}
                  </h3>
                  <ul className="list-group wt-list">
                    {section.key === 'topics' &&
                      section.entries.map((entry) => (
                        <TopicEntryRow key={entry._id} topic={entry as unknown as Topic} subtitle={true} labels={true} />
                      ))}
                    {section.key === 'arguments' &&
                      section.entries.map((entry) => (
                        <ArgumentEntryRow key={entry._id} argument={entry as unknown as Argument} subtitle={true} labels={true} />
                      ))}
                    {section.key === 'questions' &&
                      section.entries.map((entry) => (
                        <QuestionEntryRow key={entry._id} question={entry as unknown as Question} subtitle={true} labels={true} />
                      ))}
                    {section.key === 'answers' &&
                      section.entries.map((entry) => (
                        <AnswerEntryRow key={entry._id} answer={entry as unknown as Answer} subtitle={true} />
                      ))}
                    {section.key === 'issues' &&
                      section.entries.map((entry) => (
                        <IssueEntryRow key={entry._id} issue={entry as unknown as Issue} subtitle={true} />
                      ))}
                    {section.key === 'opinions' &&
                      section.entries.map((entry) => (
                        <OpinionEntryRow key={entry._id} opinion={entry as unknown as Opinion} subtitle={true} />
                      ))}
                    {section.key === 'artifacts' &&
                      section.entries.map((entry: LegacyEntity) => (
                        <li key={entry._id} className="list-group-item">
                          <Link to={`/artifacts/entry/${entry.friendlyUrl || entry._id}/${entry._id}`}>
                            {entry.title || '(Untitled)'}
                          </Link>
                        </li>
                      ))}
                  </ul>
                  {tab === 'all' && section.more && (
                    <button
                      type="button"
                      className="btn btn-default btn-sm"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set('tab', section.key);
                        setSearchParams(next);
                      }}
                    >
                      <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
      </div>
      <div style={{ marginTop: '20px' }}>
        <Link to={isOwnProfile ? '/members/profile' : `/members/${username}`} className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Profile
        </Link>
      </div>
    </ProfileShell>
  );
};

export default ProfileJournal;
