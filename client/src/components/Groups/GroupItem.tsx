import React from 'react';

interface GroupItemProps {
  title: string;
  membersCount?: number;
}

const GroupItem: React.FC<GroupItemProps> = ({ title, membersCount }) => {
  return (
    <li className="list-group-item">
      <strong>{title}</strong>
      {membersCount !== undefined ? (
        <span className="pull-right text-muted">{membersCount} members</span>
      ) : null}
    </li>
  );
};

export default GroupItem;
