import React from 'react';
import { Link } from 'react-router';

interface ArgumentLinkEntryProps {
  title: string;
  to: string;
}

const ArgumentLinkEntry: React.FC<ArgumentLinkEntryProps> = ({ title, to }) => {
  return <Link to={to}>{title}</Link>;
};

export default ArgumentLinkEntry;
