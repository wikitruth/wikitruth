import React from 'react';
import { Link } from 'react-router-dom';

interface EntryRowProps {
  id: string;
  title: string;
  to: string;
  meta?: React.ReactNode;
}

const EntryRow: React.FC<EntryRowProps> = ({ id, title, to, meta }) => {
  return (
    <li className="list-group-item" data-id={id}>
      <Link to={to}>{title}</Link>
      {meta ? <span className="pull-right text-muted">{meta}</span> : null}
    </li>
  );
};

export default EntryRow;
