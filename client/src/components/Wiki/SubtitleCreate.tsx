import React from 'react';

interface SubtitleCreateProps {
  onCreate: (value: string) => void;
}

const SubtitleCreate: React.FC<SubtitleCreateProps> = ({ onCreate }) => {
  return (
    <button type="button" className="btn btn-link" onClick={() => onCreate('')}>
      + Add subtitle
    </button>
  );
};

export default SubtitleCreate;
