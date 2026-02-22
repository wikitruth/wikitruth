import React from 'react';
import EntryVerdictLabel from './EntryVerdictLabel';

interface EntryVerdictListProps {
  verdicts: string[];
}

const EntryVerdictList: React.FC<EntryVerdictListProps> = ({ verdicts }) => {
  return (
    <div className="wt-verdict-list">
      {verdicts.map((verdict) => (
        <EntryVerdictLabel key={verdict} verdict={verdict} />
      ))}
    </div>
  );
};

export default EntryVerdictList;
