import React from 'react';

interface SubtitleEditProps {
  value: string;
  onChange: (value: string) => void;
}

const SubtitleEdit: React.FC<SubtitleEditProps> = ({ value, onChange }) => {
  return (
    <input
      type="text"
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Subtitle"
    />
  );
};

export default SubtitleEdit;
