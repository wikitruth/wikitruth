import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';
import apiService from '../services/api';

const IssueEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError('No issue ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.getIssueEntry(id);
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading issue..." />;
  }

  if (error || !data?.issue) {
    return <Alert type="danger">Error loading issue: {error || 'Issue not found'}</Alert>;
  }

  const issue = data.issue;
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Issues', url: '/issues' },
    { title: issue.title, active: true }
  ];

  // Build tabs
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/issues/entry/${issue.friendlyUrl}/${issue._id}` },
    { id: 'discussion', title: 'Discussion', url: `/issues/entry/${issue.friendlyUrl}/${issue._id}/discussion`, count: 0 }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader 
        title={issue.title}
        subtitle={issue.subtitle}
        icon="exclamation-triangle"
        iconColor="text-warning"
        actions={
          <Link to={`/issues/edit/${issue._id}`} className="btn btn-default">
            <i className="fa fa-pencil"></i> Edit
          </Link>
        }
      />
      
      <PageTabs tabs={tabs} activeTab="overview" />

      {/* Issue content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {issue.content ? (
          <div dangerouslySetInnerHTML={{ __html: issue.content }} />
        ) : issue.contentPreview ? (
          <p className="lead">{issue.contentPreview}</p>
        ) : issue.description && (
          <p className="lead">{issue.description}</p>
        )}
      </div>

      {/* Footer meta information */}
      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {issue.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Reported by: <strong>{issue.editorUsername}</strong>
          </p>
        )}
        {issue.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(issue.editDate).toLocaleDateString()}
          </p>
        )}
        {issue.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/issues" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Issues
        </Link>
      </div>
    </div>
  );
};

export default IssueEntryPage;
