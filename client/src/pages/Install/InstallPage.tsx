import React from 'react';

const InstallPage: React.FC = () => {
  return (
    <div className="container">
      <h2>Install</h2>
      <p className="text-muted">Local setup checklist for contributors.</p>
      <ol>
        <li>Install supported Node and npm versions from project `engines`.</li>
        <li>Run <code>npm install</code> in the project root.</li>
        <li>Copy environment values from <code>config/config.example.js</code>.</li>
        <li>Run <code>npm run dev:all</code> for server and client development.</li>
      </ol>
    </div>
  );
};

export default InstallPage;
