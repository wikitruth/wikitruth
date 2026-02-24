import React from 'react';
import { Link } from 'react-router-dom';

const FastSwitchPage: React.FC = () => {
  return (
    <div className="container">
      <h2>Fast Switch</h2>
      <p className="text-muted">Quick navigation links to commonly used workflows.</p>
      <div className="list-group">
        <Link to="/topics/create" className="list-group-item">Create Topic</Link>
        <Link to="/arguments/create" className="list-group-item">Create Argument</Link>
        <Link to="/questions/create" className="list-group-item">Ask Question</Link>
        <Link to="/groups/create" className="list-group-item">Create Group</Link>
        <Link to="/members/profile" className="list-group-item">My Profile</Link>
      </div>
    </div>
  );
};

export default FastSwitchPage;
