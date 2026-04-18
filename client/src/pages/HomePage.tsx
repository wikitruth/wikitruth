import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { Answer, Application, Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';
import type { LegacyEntity } from '../types/legacy';
import LoadingSpinner from '../components/LoadingSpinner';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import IssueEntryRow from '../components/EntryRow/IssueEntryRow';
import OpinionEntryRow from '../components/EntryRow/OpinionEntryRow';
import PageMeta from '../components/common/PageMeta';
import { useNotification } from '../context/NotificationContext';

type HomeEntrySetColumn = {
  entries?: LegacyEntity[];
};

interface HomeData {
  topics?: Topic[];
  arguments?: Argument[];
  questions?: Question[];
  answers?: Answer[];
  issues?: Issue[];
  opinions?: Opinion[];
  artifacts?: Artifact[];
  application?: Application;
  entrySet?: HomeEntrySetColumn[];
  topicsMore?: boolean;
  argumentsMore?: boolean;
  questionsMore?: boolean;
  answersMore?: boolean;
  issuesMore?: boolean;
  opinionsMore?: boolean;
  artifactsMore?: boolean;
}

function toTimestamp(value: unknown): number {
  const parsed = new Date(String(value || '')).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function countChildren(entry: LegacyEntity): number {
  const childrenCount = entry.childrenCount || {};
  return (
    Number(childrenCount.topics?.accepted || childrenCount.topics?.total || 0) +
    Number(childrenCount.arguments?.accepted || childrenCount.arguments?.total || 0) +
    Number(childrenCount.questions?.accepted || childrenCount.questions?.total || 0) +
    Number(childrenCount.answers?.accepted || childrenCount.answers?.total || 0) +
    Number(childrenCount.artifacts?.accepted || childrenCount.artifacts?.total || 0) +
    Number(childrenCount.issues?.accepted || childrenCount.issues?.total || 0) +
    Number(childrenCount.opinions?.accepted || childrenCount.opinions?.total || 0)
  );
}

function verdictWeight(entry: LegacyEntity): number {
  const status = Number((entry.verdict as { status?: number } | undefined)?.status);
  if (!Number.isFinite(status)) {
    return 0;
  }
  if (status === 1) {
    return 4;
  }
  if (status === 2) {
    return 2;
  }
  return 1;
}

function trendingScore(entry: LegacyEntity): number {
  const editedAt = toTimestamp(entry.editDate || entry.createDate);
  const ageHours = Math.max(0, (Date.now() - editedAt) / (60 * 60 * 1000));
  const recency = Math.max(0, 1 - ageHours / 168); // 7-day recency window
  return countChildren(entry) * 2 + verdictWeight(entry) + recency * 6;
}

function topScore(entry: LegacyEntity): number {
  return countChildren(entry) * 3 + verdictWeight(entry) * 2 + Number(entry.points || 0);
}

function getLegacyEntryPath(entry: LegacyEntity): string | null {
  const id = encodeURIComponent(String(entry._id || ''));
  const friendly = encodeURIComponent(String(entry.friendlyUrl || ''));

  switch (String(entry.objectName || '')) {
    case 'topic':
      return `/topics/entry/${friendly || id}/${id}`;
    case 'argument':
      return `/arguments/entry/${friendly || id}/${id}`;
    case 'question':
      return `/questions/entry/${friendly || id}/${id}`;
    case 'answer':
      return `/answers/entry/${id}`;
    case 'issue':
      return friendly ? `/issues/entry/${friendly}/${id}` : `/issues/entry/${id}`;
    case 'opinion':
      return friendly ? `/opinions/entry/${friendly}/${id}` : `/opinions/entry/${id}`;
    case 'artifact':
      return `/artifacts/entry/${friendly || id}/${id}`;
    default:
      return null;
  }
}

const HomePage: React.FC = () => {
  const [data, setData] = useState<HomeData>({});
  const [loading, setLoading] = useState(true);
  const { addToast } = useNotification();
  const { application } = data;
  const entrySetColumns = (data.entrySet || []) as HomeEntrySetColumn[];

  const rankedEntries = React.useMemo(() => {
    const unique = new Map<string, LegacyEntity>();
    const pushEntry = (entry: LegacyEntity, fallbackObjectName?: string) => {
      const id = String(entry._id || '');
      if (!id) {
        return;
      }
      const objectName = String(entry.objectName || fallbackObjectName || '').trim().toLowerCase();
      const key = `${objectName}:${id}`;
      if (!unique.has(key)) {
        unique.set(key, objectName ? { ...entry, objectName } : entry);
      }
    };

    if (entrySetColumns.length > 0) {
      entrySetColumns.forEach((column) => (column.entries || []).forEach((entry) => pushEntry(entry)));
    } else {
      (data.topics || []).forEach((entry) => pushEntry(entry as unknown as LegacyEntity, 'topic'));
      (data.arguments || []).forEach((entry) => pushEntry(entry as unknown as LegacyEntity, 'argument'));
      (data.questions || []).forEach((entry) => pushEntry(entry as unknown as LegacyEntity, 'question'));
      (data.answers || []).forEach((entry) => pushEntry(entry as unknown as LegacyEntity, 'answer'));
      (data.issues || []).forEach((entry) => pushEntry(entry as unknown as LegacyEntity, 'issue'));
      (data.opinions || []).forEach((entry) => pushEntry(entry as unknown as LegacyEntity, 'opinion'));
      (data.artifacts || []).forEach((entry) => pushEntry(entry as unknown as LegacyEntity, 'artifact'));
    }

    const all = Array.from(unique.values());
    const latest = [...all].sort((a, b) => toTimestamp(b.editDate || b.createDate) - toTimestamp(a.editDate || a.createDate)).slice(0, 8);
    const trending = [...all].sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 8);
    const top = [...all].sort((a, b) => topScore(b) - topScore(a)).slice(0, 8);

    return { latest, trending, top };
  }, [data, entrySetColumns]);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const result = (await apiService.getHomeData()) as HomeData;
      setData(result);
      setLoading(false);
    } catch (error) {
      addToast('danger', 'Failed to load homepage data');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading homepage..." />;
  }

  const renderMixedEntry = (entry: LegacyEntity) => {
    const entryType = String(entry.objectName || '');
    switch (entryType) {
      case 'topic':
        return (
          <TopicEntryRow
            key={`entry-topic-${entry._id}`}
            topic={entry as unknown as Topic}
            subtitle={true}
            standalone={true}
            contentPreview={String(entry.contentPreview || '')}
            showMore={Boolean(entry.showMore)}
          />
        );
      case 'argument':
        return (
          <ArgumentEntryRow
            key={`entry-argument-${entry._id}`}
            argument={entry as unknown as Argument}
            subtitle={true}
          />
        );
      case 'question':
        return (
          <QuestionEntryRow
            key={`entry-question-${entry._id}`}
            question={entry as unknown as Question}
            subtitle={true}
          />
        );
      case 'answer':
        return (
          <AnswerEntryRow
            key={`entry-answer-${entry._id}`}
            answer={entry as unknown as Answer}
            subtitle={true}
          />
        );
      case 'issue':
        return (
          <IssueEntryRow
            key={`entry-issue-${entry._id}`}
            issue={entry as unknown as Issue}
            subtitle={true}
          />
        );
      case 'opinion':
        return (
          <OpinionEntryRow
            key={`entry-opinion-${entry._id}`}
            opinion={entry as unknown as Opinion}
            subtitle={true}
          />
        );
      case 'artifact': {
        const entryPath = getLegacyEntryPath(entry);
        return (
          <li key={`entry-artifact-${entry._id}`} className="list-group-item">
            <i className="fa fa-puzzle-piece text-muted-x" aria-hidden="true"></i>
            <div>
              {entryPath ? (
                <Link to={entryPath}>{entry.title || '(Untitled)'}</Link>
              ) : (
                <span>{entry.title || '(Untitled)'}</span>
              )}
              {entry.editorUsername || entry.editDate ? (
                <div className="text-muted">
                  <small>
                    {entry.editorUsername ? (
                      <>
                        <i className="fa fa-user"></i> {entry.editorUsername}
                      </>
                    ) : null}
                    {entry.editDate ? (
                      <>
                        {' '}
                        <i className="fa fa-clock-o"></i>{' '}
                        {new Date(entry.editDate).toLocaleDateString()}
                      </>
                    ) : null}
                  </small>
                </div>
              ) : null}
            </div>
          </li>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div>
      <PageMeta title="Home" description="A systematic discourse and knowledge contribution using dialectics and vetting" />
      {/* Jumbotron */}
      <div className="jumbotron">
        {application ? (
          <>
            <h1>{application.jumbotron?.title}</h1>
            <p className="lead">{application.jumbotron?.description}</p>
          </>
        ) : (
          <>
            <h1>The Wikitruth Project</h1>
            <p className="lead">
              A systematic discourse and knowledge contribution using dialectics and vetting
              to verify knowledge that is true or false, right or wrong, and good or bad.
            </p>
          </>
        )}
        <p>
          <Link className="btn btn-lg btn-success wt-btn-explore" to="/topics" role="button">
            <i className="fa fa-globe"></i> Explore
          </Link>
          <Link
            className="btn btn-lg btn-info wt-btn-visualize"
            to="/visualize"
            role="button"
          >
            <i className="fa fa-snowflake-o"></i> Visualize
          </Link>
          <Link className="btn btn-lg btn-warning" to="/about" role="button">
            Learn more
          </Link>
        </p>
      </div>

      {/* Feature Sections */}
      {application?.sections ? (
        <div className="row">
          {application.sections.map((section, index: number) => (
            <div key={index} className="col-lg-4 col-md-6 col-sm-6 wt-section-col text-body">
              <h2 className="wt-feature-header" data-title={section.title}>
                <i className={section.iconClass}></i> {section.title}
              </h2>
              <p>{section.description}</p>
              {section.url && (
                <p>
                  <Link className="btn btn-default btn-block" to={section.url} role="button">
                    Explore &raquo;
                  </Link>
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="row">
          <div className="col-lg-4 col-md-6 col-sm-6 wt-section-col text-body">
            <h2 className="wt-feature-header" data-title="Truth & Reality">
              <i className="fa fa-globe"></i> Truth &amp; Reality
            </h2>
            <p>
              Find out the truth and reality on important topics that impact the society
              including controversies around politics, environment, culture and conspiracy
              theories which divide the society and result to conflict.
            </p>
          </div>
          <div className="col-lg-4 col-md-6 col-sm-6 wt-section-col text-body">
            <h2 className="wt-feature-header" data-title="Religion & Worldviews">
              <i className="fa fa-book"></i> Religion &amp; Worldviews
            </h2>
            <p>
              Compilation of world religions, ideologies, philosophies and worldviews with
              details on their achievements or issues, their primary belief or doctrines
              categorized by good, bad, and dangerous.
            </p>
          </div>
          <div className="col-lg-4 col-md-6 col-sm-6 wt-section-col text-body">
            <h2 className="wt-feature-header" data-title="Morality & Ethics">
              <i className="fa fa-balance-scale"></i> Morality &amp; Ethics
            </h2>
            <p>
              Virtues, morally right and wrong acts supported by reason, facts and human
              consensus under the notion that there are right and wrong that most people can
              agree with and find them fair, logical and reasonable.
            </p>
          </div>
        </div>
      )}

      <h1 className="page-header wt-header">
        <i className="fa fa-globe"></i> Latest Posts
      </h1>
      <p className="text-muted">
        Ranking formulas: <strong>Latest</strong> by most recent edit date, <strong>Trending</strong> by recency + child activity + verdict signal, <strong>Top</strong> by activity + verdict + score.
      </p>

      {rankedEntries.latest.length > 0 || rankedEntries.trending.length > 0 || rankedEntries.top.length > 0 ? (
        <div className="row">
          {([
            { key: 'latest', label: 'Latest', icon: 'clock-o', entries: rankedEntries.latest },
            { key: 'trending', label: 'Trending', icon: 'line-chart', entries: rankedEntries.trending },
            { key: 'top', label: 'Top', icon: 'star', entries: rankedEntries.top },
          ] as Array<{ key: string; label: string; icon: string; entries: LegacyEntity[] }>).map((bucket) => (
            <div key={bucket.key} className="col-md-4 col-sm-12">
              <div className="wt-list-container">
                <ul className="list-group top-list-items wt-list">
                  <li className="list-group-item highlight">
                    <i className={`fa fa-${bucket.icon} text-muted-x`} aria-hidden="true"></i>
                    <div>{bucket.label}</div>
                  </li>
                  {bucket.entries.map((entry) => renderMixedEntry(entry))}
                </ul>
                <div className="top-list-items-more">
                  <Link to="/explore#browse" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
      <div className="row">
        {/* Topics */}
        {data.topics && data.topics.length > 0 && (
          <div className="col-md-6 col-sm-12">
            <div className="wt-list-container">
              <ul className="list-group top-list-items wt-list">
                <li className="list-group-item highlight">
                  <i className="fa fa-folder-open text-success-x" aria-hidden="true"></i>
                  <div>Topics</div>
                </li>
                {data.topics.map((topic) => (
                  <TopicEntryRow key={topic._id} topic={topic} subtitle={true} />
                ))}
              </ul>
              {data.topicsMore && (
                <div className="top-list-items-more">
                  <Link to="/topics" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Arguments */}
        {data.arguments && data.arguments.length > 0 && (
          <div className="col-md-6 col-sm-12">
            <div className="wt-list-container">
              <ul className="list-group top-list-items wt-list">
                <li className="list-group-item highlight text-primary">
                  <span className="glyphicon glyphicon-flash" aria-hidden="true"></span>
                  <div>Facts</div>
                </li>
                {data.arguments.map((argument) => (
                  <ArgumentEntryRow key={argument._id} argument={argument} subtitle={true} />
                ))}
              </ul>
              {data.argumentsMore && (
                <div className="top-list-items-more">
                  <Link to="/arguments" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="row">
        {/* Questions */}
        {data.questions && data.questions.length > 0 && (
          <div className="col-md-6 col-sm-12">
            <div className="wt-list-container">
              <ul className="list-group top-list-items wt-list">
                <li className="list-group-item highlight">
                  <span className="glyphicon glyphicon-question-sign text-success-x" aria-hidden="true"></span>
                  <div>Questions</div>
                </li>
                {data.questions.map((question) => (
                  <QuestionEntryRow key={question._id} question={question} subtitle={true} />
                ))}
              </ul>
              {data.questionsMore && (
                <div className="top-list-items-more">
                  <Link to="/questions" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Answers */}
        {data.answers && data.answers.length > 0 && (
          <div className="col-md-6 col-sm-12">
            <div className="wt-list-container">
              <ul className="list-group top-list-items wt-list">
                <li className="list-group-item highlight">
                  <i className="fa fa-check-circle-o text-success-x" aria-hidden="true"></i>
                  <div>Answers</div>
                </li>
                {data.answers.map((answer) => (
                  <AnswerEntryRow key={answer._id} answer={answer} subtitle={true} />
                ))}
              </ul>
              {data.answersMore && (
                <div className="top-list-items-more">
                  <Link to="/answers" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="row">
        {/* Artifacts */}
        {data.artifacts && data.artifacts.length > 0 && (
          <div className="col-md-6 col-sm-12">
            <div className="wt-list-container">
              <ul className="list-group top-list-items wt-list">
                <li className="list-group-item highlight">
                  <i className="fa fa-puzzle-piece text-muted-x" aria-hidden="true"></i>
                  <div>Artifacts</div>
                </li>
                {data.artifacts.map((artifact) => (
                  <li key={artifact._id} className="list-group-item">
                    <a href={`/artifacts/entry/${artifact.friendlyUrl || artifact._id}/${artifact._id}`}>
                      {artifact.title || '(Untitled)'}
                    </a>
                  </li>
                ))}
              </ul>
              {data.artifactsMore && (
                <div className="top-list-items-more">
                  <Link to="/artifacts" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Issues */}
        {data.issues && data.issues.length > 0 && (
          <div className="col-md-6 col-sm-12">
            <div className="wt-list-container">
              <ul className="list-group top-list-items wt-list">
                <li className="list-group-item highlight">
                  <i className="fa fa-exclamation-triangle text-warning" aria-hidden="true"></i>
                  <div>Issues</div>
                </li>
                {data.issues.map((issue) => (
                  <IssueEntryRow key={issue._id} issue={issue} subtitle={true} />
                ))}
              </ul>
              {data.issuesMore && (
                <div className="top-list-items-more">
                  <Link to="/issues" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Opinions */}
        {data.opinions && data.opinions.length > 0 && (
          <div className="col-md-6 col-sm-12">
            <div className="wt-list-container">
              <ul className="list-group top-list-items wt-list">
                <li className="list-group-item highlight">
                  <i className="fa fa-comment text-info" aria-hidden="true"></i>
                  <div>Opinions</div>
                </li>
                {data.opinions.map((opinion) => (
                  <OpinionEntryRow key={opinion._id} opinion={opinion} subtitle={true} />
                ))}
              </ul>
              {data.opinionsMore && (
                <div className="top-list-items-more">
                  <Link to="/opinions" role="button" className="btn btn-default btn-sm">
                    <i className="fa fa-arrow-circle-right text-muted" aria-hidden="true"></i> view more
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default HomePage;
