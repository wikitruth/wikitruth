import React from 'react';
import PageMeta from '../../components/common/PageMeta';

const ServerError500: React.FC = () => {
  return (
    <div className="container text-center" style={{ marginTop: '80px' }}>
      <PageMeta title="Server Error" />
      <h1>500</h1>
      <p>Something went wrong on the server.</p>
    </div>
  );
};

export default ServerError500;
