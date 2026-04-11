import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import { trackEvent } from '../utils/analytics';

const NotFoundPage: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    trackEvent('404', 'error', location.pathname);
  }, [location.pathname]);
  return (
    <div className="text-center" style={{ padding: '80px 20px' }}>
      <PageMeta title="Page Not Found" />
      <h1 style={{ fontSize: '120px', marginBottom: '20px' }}>
        <i className="fa fa-question-circle text-muted"></i>
      </h1>
      <h2>404 - Page Not Found</h2>
      <p className="lead" style={{ marginTop: '20px', marginBottom: '40px' }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div>
        <Link to="/" className="btn btn-primary btn-lg">
          <i className="fa fa-home"></i> Go to Homepage
        </Link>
        {' '}
        <Link to="/search" className="btn btn-default btn-lg">
          <i className="fa fa-search"></i> Search
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
