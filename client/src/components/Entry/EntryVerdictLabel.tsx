import React from 'react';

interface EntryVerdictLabelProps {
  verdict: string;
}

const EntryVerdictLabel: React.FC<EntryVerdictLabelProps> = ({ verdict }) => {
  return <span className="label label-primary">{verdict}</span>;
};

export default EntryVerdictLabel;
