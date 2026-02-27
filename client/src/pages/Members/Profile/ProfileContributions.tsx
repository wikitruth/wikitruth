import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ProfileShell from '../../../components/Members/ProfileShell';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';
import type { MemberContributionsResponse } from '../../../types/api';
import TopicEntryRow from '../../../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../../../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../../../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../../../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../../../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../../../components/EntryRow/OpinionEntryRow';
import type { Answer, Argument, Issue, Opinion, Question, Topic } from '../../../types';

const ProfileContributions: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const username = routeUsername || user?.username || '';
  const tab = (searchParams.get('tab') || 'all').toLowerCase();
  const screening = (searchParams.get('screening') || 'all').toLowerCase();
  const sort = (searchParams.get('sort') || 'latest').toLowerCase();
  const [data, setData] = useState<MemberContributionsResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOwnProfile = useMemo(() => Boolean(user?.username && username && user.username === username), [user?.username, username]);

  useEffect(() => {
    const load = async () => {
      if (!username) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.getMemberContributions(username, tab);
        setData(result || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contributions');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [username, tab]);

  const sections = useMemo(
    () => {
      const applyScreeningAndSort = (entries: LegacyEntity[]): LegacyEntity[] => {
        const filtered = entries.filter((entry) => {
          const status = Number(entry.screening?.status);
          if (screening === 'accepted') {
            return status === 1;
          }
          if (screening === 'pending') {
            return status === 0;
          }
          if (screening === 'rejected') {
            return status === 2;
          }
          return true;
        });

        const sorted = [...filtered].sort((left, right) => {
          if (sort === 'popular') {
            return Number(right.points || 0) - Number(left.points || 0);
          }
          const rightTime = new Date(right.editDate || right.createDate || 0).getTime();
          const leftTime = new Date(left.editDate || left.createDate || 0).getTime();
          return rightTime - leftTime;
        });

        return sorted;
      };

      return [
        { key: 'topics', label: 'Topics', icon: 'folder-open', entries: applyScreeningAndSort((data.topics || []) as LegacyEntity[]), more: Boolean(data.topicsMore) },
        { key: 'arguments', label: 'Facts', icon: 'flash', entries: applyScreeningAndSort((data.arguments || []) as LegacyEntity[]), more: Boolean(data.argumentsMore) },
        { key: 'questions', label: 'Questions', icon: 'question-circle', entries: applyScreeningAndSort((data.questions || []) as LegacyEntity[]), more: Boolean(data.questionsMore) },
        { key: 'answers', label: 'Answers', icon: 'check-circle-o', entries: applyScreeningAndSort((data.answers || []) as LegacyEntity[]), more: Boolean(data.answersMore) },
        { key: 'artifacts', label: 'Artifacts', icon: 'puzzle-piece', entries: applyScreeningAndSort((data.artifacts || []) as LegacyEntity[]), more: Boolean(data.artifactsMore) },
        { key: 'issues', label: 'Issues', icon: 'exclamation-circle', entries: applyScreeningAndSort((data.issues || []) as LegacyEntity[]), more: Boolean(data.issuesMore) },
        { key: 'opinions', label: 'Comments', icon: 'comments-o', entries: applyScreeningAndSort((data.opinions || []) as LegacyEntity[]), more: Boolean(data.opinionsMore) },
      ];
    },
    [data, screening, sort],
  );

  if (loading) {
    return <LoadingSpinner message="Loading contributions..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <ProfileShell username={username} activeTab="contributions" isOwnProfile={isOwnProfile}>
      <div style={{ marginTop: '15px' }}>
        <div style={{ marginBottom: '15px' }} className="wt-btn-group">
          <div className="btn-group" role="group" aria-label="Latest or Popular Filter" style={{ marginBottom: '5px' }}>
            <button
              type="button"
              className={`btn btn-sm ${sort === 'latest' ? 'btn-info' : 'btn-default'}`}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('sort', 'latest');
                setSearchParams(next);
              }}
            >
              Latest
            </button>
            <button
              type="button"
              className={`btn btn-sm ${sort === 'popular' ? 'btn-info' : 'btn-default'}`}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('sort', 'popular');
                setSearchParams(next);
              }}
            >
              Popular
            </button>
          </div>
          <span>&nbsp;&nbsp;</span>
          <div className="btn-group" role="group" aria-label="Screening Filter" style={{ marginBottom: '5px' }}>
            {[
              { key: 'all', label: 'All', theme: 'success' },
              { key: 'accepted', label: 'Accepted', theme: 'info' },
              { key: 'pending', label: 'Pending', theme: 'warning' },
              { key: 'rejected', label: 'Rejected', theme: 'danger' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`btn btn-sm btn-${screening === item.key ? item.theme : 'default'}`}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set('screening', item.key);
                  setSearchParams(next);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

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

        {!data.results && <p style={{ fontWeight: 'normal' }} className="text-muted-x">No contributions found</p>}

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

export default ProfileContributions;
