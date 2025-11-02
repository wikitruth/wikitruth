import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import PageTabs from '../components/common/PageTabs';
import Alert from '../components/common/Alert';

const ArgumentEntryPage: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArgumentEntry();
  }, [id]);

  const fetchArgumentEntry = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const result: any = await apiService.getArgumentEntry(id);
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching argument entry:', err);
      setError('Failed to load argument');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading argument..." />;
  }

  if (error || !data?.argument) {
    return <Alert type="danger">{error || 'Argument not found'}</Alert>;
  }

  const { argument } = data;
  
  const getVerdictClass = () => {
    if (!argument.verdict?.result) return 'text-muted';
    switch (argument.verdict.result) {
      case 'true':
        return 'text-success';
      case 'false':
        return 'text-danger';
      case 'unknown':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Arguments', url: '/arguments' },
    { title: argument.title, active: true }
  ];

  // Build tabs
  const tabs = [
    { id: 'overview', title: 'Overview', url: `/arguments/entry/${argument.friendlyUrl}/${argument._id}` },
    { id: 'discussion', title: 'Discussion', url: `/arguments/entry/${argument.friendlyUrl}/${argument._id}/discussion`, count: 0 }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader 
        title={argument.title}
        subtitle={argument.subtitle}
        icon="flash"
        iconColor="text-primary"
      />
      
      <PageTabs tabs={tabs} activeTab="overview" />

      {/* Verdict Badge */}
      {argument.verdict?.result && (
        <div className="alert alert-sm" 
             style={{ 
               backgroundColor: argument.verdict.result === 'true' ? '#dff0d8' : 
                                argument.verdict.result === 'false' ? '#f2dede' : '#fcf8e3',
               border: 'none',
               display: 'inline-block',
               padding: '5px 10px',
               marginTop: '10px'
             }}>
          <strong>Verdict:</strong> {argument.verdict.result.toUpperCase()}
        </div>
      )}

      {/* Argument content */}
      <div className="text-body collapsible" style={{ marginTop: '20px' }}>
        {argument.content ? (
          <div dangerouslySetInnerHTML={{ __html: argument.content }} />
        ) : argument.description && (
          <p className="lead">{argument.description}</p>
        )}
      </div>

      {/* Footer meta information */}
      <div className="wt-entry-meta" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        {argument.editorUsername && (
          <p className="text-muted">
            <i className="fa fa-user"></i> Edited by: <strong>{argument.editorUsername}</strong>
          </p>
        )}
        {argument.editDate && (
          <p className="text-muted">
            <i className="fa fa-clock-o"></i> Last updated: {new Date(argument.editDate).toLocaleDateString()}
          </p>
        )}
        {argument.private && (
          <p>
            <span className="label label-default">Private</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/arguments" className="btn btn-default">
          <i className="fa fa-arrow-left"></i> Back to Arguments
        </Link>
      </div>
    </div>
  );
};

export default ArgumentEntryPage;
