import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
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
  const [data, setData] = useState<MemberContributionsResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    () => [
      { key: 'topics', label: 'Topics', entries: data.topics || [], more: Boolean(data.topicsMore) },
      { key: 'arguments', label: 'Facts', entries: data.arguments || [], more: Boolean(data.argumentsMore) },
      { key: 'questions', label: 'Questions', entries: data.questions || [], more: Boolean(data.questionsMore) },
      { key: 'answers', label: 'Answers', entries: data.answers || [], more: Boolean(data.answersMore) },
      { key: 'artifacts', label: 'Artifacts', entries: data.artifacts || [], more: Boolean(data.artifactsMore) },
      { key: 'issues', label: 'Issues', entries: data.issues || [], more: Boolean(data.issuesMore) },
      { key: 'opinions', label: 'Comments', entries: data.opinions || [], more: Boolean(data.opinionsMore) },
    ],
    [data],
  );

  if (loading) {
    return <LoadingSpinner message="Loading contributions..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <div className="container">
      <h2>Profile Contributions</h2>
      <p className="text-muted">Recent contributions by {username}.</p>

      <ul className="nav nav-tabs wt-tabs" role="tablist">
        <li role="presentation" className={tab === 'all' ? 'active' : ''}>
          <a
            href="#all"
            onClick={(event) => {
              event.preventDefault();
              setSearchParams({});
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
                setSearchParams({ tab: section.key });
              }}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>

      {!data.results && <Alert type="warning">No contributions found.</Alert>}

      {sections
        .filter((section) => tab === 'all' || tab === section.key)
        .map((section) => (
          <div key={section.key} style={{ marginTop: '20px' }}>
            <h4>{section.label}</h4>
            {section.entries.length === 0 ? (
              <p className="text-muted">No {section.label.toLowerCase()} yet.</p>
            ) : (
              <>
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
                    onClick={() => setSearchParams({ tab: section.key })}
                  >
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      <div style={{ marginTop: '20px' }}>
        <Link to={`/members/${username}`} className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Profile
        </Link>
      </div>
    </div>
  );
};

export default ProfileContributions;
