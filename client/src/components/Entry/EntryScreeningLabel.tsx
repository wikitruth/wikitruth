import React from 'react';

interface EntryScreeningLabelProps {
  status: string;
}

const EntryScreeningLabel: React.FC<EntryScreeningLabelProps> = ({ status }) => {
  return <span className="label label-info">{status}</span>;
};

export default EntryScreeningLabel;
