import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import GeoPattern from 'geopattern';
import apiService from '../services/api';
import type { Answer, Application, Argument, Artifact, Issue, Opinion, Question, Topic } from '../types';
import type { LegacyEntity } from '../types/legacy';
import LoadingSpinner from '../components/LoadingSpinner';
import TopicEntryRow from '../components/EntryRow/TopicEntryRow';
import ArgumentEntryRow from '../components/EntryRow/ArgumentEntryRow';
import QuestionEntryRow from '../components/EntryRow/QuestionEntryRow';
import AnswerEntryRow from '../components/EntryRow/AnswerEntryRow';
import ArtifactEntryRow from '../components/EntryRow/ArtifactEntryRow';
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

const FALLBACK_FEATURE_SECTION_TITLES = [
  'Truth & Reality',
  'Religion & Worldviews',
  'Morality & Ethics',
];

const buildFeatureHeaderStyle = (title: string): React.CSSProperties => {
  const seed = String(title || 'feature');
  try {
    const pattern = GeoPattern.generate(seed);
    return {
      backgroundImage: pattern.toDataUrl(),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  } catch (_error) {
    return {};
  }
};

const HomePage: React.FC = () => {
  const [data, setData] = useState<HomeData>({});
  const [loading, setLoading] = useState(true);
  const { addToast } = useNotification();
  const { application } = data;
  const entrySetColumns = (data.entrySet || []) as HomeEntrySetColumn[];
  const featureHeaderStyles = useMemo(() => {
    const styleMap = new Map<string, React.CSSProperties>();
    const sectionTitles =
      application?.sections?.map((section) => String(section.title || '').trim()) ||
      FALLBACK_FEATURE_SECTION_TITLES;

    sectionTitles.forEach((title) => {
      if (!title || styleMap.has(title)) {
        return;
      }
      styleMap.set(title, buildFeatureHeaderStyle(title));
    });

    return styleMap;
  }, [application?.sections]);
  const getFeatureHeaderStyle = (title: string): React.CSSProperties => {
    const normalizedTitle = String(title || '').trim();
    if (!normalizedTitle) {
      return {};
    }

    return featureHeaderStyles.get(normalizedTitle) || buildFeatureHeaderStyle(normalizedTitle);
  };

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
        return (
          <ArtifactEntryRow
            key={`entry-artifact-${entry._id}`}
            artifact={entry as unknown as Artifact}
            subtitle={true}
            labels={true}
            contentPreview={String(entry.contentPreview || '')}
            showMore={Boolean(entry.showMore)}
          />
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
              <h2
                className="wt-feature-header"
                data-title={section.title}
                style={getFeatureHeaderStyle(section.title)}
              >
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
            <h2
              className="wt-feature-header"
              data-title="Truth & Reality"
              style={getFeatureHeaderStyle('Truth & Reality')}
            >
              <i className="fa fa-globe"></i> Truth &amp; Reality
            </h2>
            <p>
              Find out the truth and reality on important topics that impact the society
              including controversies around politics, environment, culture and conspiracy
              theories which divide the society and result to conflict.
            </p>
          </div>
          <div className="col-lg-4 col-md-6 col-sm-6 wt-section-col text-body">
            <h2
              className="wt-feature-header"
              data-title="Religion & Worldviews"
              style={getFeatureHeaderStyle('Religion & Worldviews')}
            >
              <i className="fa fa-book"></i> Religion &amp; Worldviews
            </h2>
            <p>
              Compilation of world religions, ideologies, philosophies and worldviews with
              details on their achievements or issues, their primary belief or doctrines
              categorized by good, bad, and dangerous.
            </p>
          </div>
          <div className="col-lg-4 col-md-6 col-sm-6 wt-section-col text-body">
            <h2
              className="wt-feature-header"
              data-title="Morality & Ethics"
              style={getFeatureHeaderStyle('Morality & Ethics')}
            >
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

      {entrySetColumns.length > 0 ? (
        <div className="row">
          {entrySetColumns.map((column, index) => (
            <div key={`entry-set-${index}`} className="col-md-6 col-sm-12">
              <div className="wt-list-container">
                <ul className="list-group top-list-items wt-list">
                  {(column.entries || []).map((entry) => renderMixedEntry(entry))}
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
                  <ArtifactEntryRow key={artifact._id} artifact={artifact} subtitle={true} labels={true} />
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
