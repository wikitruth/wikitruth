import React from 'react';

const MembersHeader: React.FC = () => {
  return (
    <div className="page-header wt-header">
      <h1>
        <i className="fa fa-user-circle"></i> Members
      </h1>
      <p className="text-muted">Community members and contributors.</p>
    </div>
  );
};

export default MembersHeader;
