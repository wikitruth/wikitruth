import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import Alert from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';

type CreateTarget = {
  label: string;
  description: string;
  to: string;
  icon: string;
};

function useQueryParam(name: string): string {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get(name) || '', [location.search, name]);
}

const CreateWizardPage: React.FC = () => {
  const { user } = useAuth();
  const topicId = useQueryParam('topic');
  const encodedTopic = topicId ? `?topic=${encodeURIComponent(topicId)}` : '';

  const targets: CreateTarget[] = [
    {
      label: 'Topic',
      description: 'Create a new topic or subtopic.',
      to: `/topics/create${encodedTopic}`,
      icon: 'folder-open',
    },
    {
      label: 'Fact',
      description: 'Create an argument/fact linked to a topic.',
      to: `/arguments/create${encodedTopic}`,
      icon: 'flash',
    },
    {
      label: 'Question',
      description: 'Ask a question for the selected topic.',
      to: `/questions/create${encodedTopic}`,
      icon: 'question-circle',
    },
    {
      label: 'Answer',
      description: 'Contribute an answer for an existing question.',
      to: '/answers/create',
      icon: 'check-circle',
    },
    {
      label: 'Issue',
      description: 'Report an issue with current content.',
      to: `/issues/create${encodedTopic}`,
      icon: 'exclamation-circle',
    },
    {
      label: 'Comment',
      description: 'Share a discussion comment or reply.',
      to: `/opinions/create${encodedTopic}`,
      icon: 'comments-o',
    },
    {
      label: 'Artifact',
      description: 'Attach supporting references or artifacts.',
      to: `/artifacts/create${encodedTopic}`,
      icon: 'puzzle-piece',
    },
  ];

  return (
    <div className="container">
      <PageMeta title="Create" description="Create wizard for modern authoring flows." />
      <h2>Create</h2>
      <p className="text-muted">Pick what you want to create. The wizard keeps context when started from a topic.</p>
      {topicId ? <Alert type="info">Context target detected: topic <code>{topicId}</code></Alert> : null}
      {!user ? (
        <Alert type="info">
          Want to contribute without an account? <Link to="/contribute">Submit an anonymous proposal for screening</Link>.
        </Alert>
      ) : null}
      <Alert type="info">
        Before publishing, review the <Link to="/policies">contribution, evidence, and moderation policies</Link>.
      </Alert>

      <div className="row">
        {targets.map((target) => (
          <div key={target.label} className="col-sm-6 col-md-4" style={{ marginBottom: 16 }}>
            <div className="panel panel-default" style={{ minHeight: 150 }}>
              <div className="panel-body">
                <h4 style={{ marginTop: 0 }}>
                  <i className={`fa fa-${target.icon}`} aria-hidden="true"></i> {target.label}
                </h4>
                <p className="text-muted">{target.description}</p>
                <Link to={target.to} className="btn btn-primary btn-sm">
                  Continue
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreateWizardPage;
