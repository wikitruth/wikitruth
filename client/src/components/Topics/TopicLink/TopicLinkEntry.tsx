import React from 'react';
import { Link } from 'react-router';

interface TopicLinkEntryProps {
  title: string;
  to: string;
}

const TopicLinkEntry: React.FC<TopicLinkEntryProps> = ({ title, to }) => {
  return <Link to={to}>{title}</Link>;
};

export default TopicLinkEntry;
