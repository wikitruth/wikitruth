import React from 'react';

const ServerError500: React.FC = () => {
  return (
    <div className="container text-center" style={{ marginTop: '80px' }}>
      <h1>500</h1>
      <p>Something went wrong on the server.</p>
    </div>
  );
};

export default ServerError500;
