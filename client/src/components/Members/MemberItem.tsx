import React from 'react';

interface MemberItemProps {
  username: string;
  role?: string;
}

const MemberItem: React.FC<MemberItemProps> = ({ username, role }) => {
  return (
    <li className="list-group-item">
      <strong>{username}</strong>
      {role ? <span className="label label-default pull-right">{role}</span> : null}
    </li>
  );
};

export default MemberItem;
