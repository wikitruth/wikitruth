import React from 'react';
import PageMeta from '../../components/common/PageMeta';

const ServiceUnavailable503: React.FC = () => {
  return (
    <div className="container text-center" style={{ marginTop: '80px' }}>
      <PageMeta title="Service Unavailable" />
      <h1>503</h1>
      <p>Service is temporarily unavailable.</p>
    </div>
  );
};

export default ServiceUnavailable503;
